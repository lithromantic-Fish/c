import { createRouter, createWebHistory } from "vue-router";
import {
  getAuthTokenByCode,
  getPcenterTokenByCode,
} from "@/utils/authRedirect";
import { setAuthCodeHandling } from "@/utils/oauth";
import { ROUTES, PAGE_BASE } from "@/constants/routes";
import routes from "./routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// OAuth 过程中的临时状态 key。
const RETURN_URL_KEY = "wf_return_url";
const AUTH_STAGE_KEY = "wf_auth_stage";
const AUTH_ERROR_KEY = "wf_auth_error";
const AUTH_STAGE_PCENTER = "pcenter";

// 后端入口只通过 path 传确定的页面名称，例如 ?path=climbProcess。
const ENTRY_ROUTE_QUERY_KEY = "path";
const ENTRY_ROUTE_MAP = {
  mobileApproval: ROUTES.mobileApproval,
  index: ROUTES.index,
  climbProcess: ROUTES.climbProcess,
  AdvancedFilter: ROUTES.advancedFilter,
  Nosupported: ROUTES.nosupported,
};

function isAuthDebugEnabled(query = {}) {
  return firstQueryValue(query.debugAuth) === "1";
}

// vue-router query 可能是 string 或 string[]，这里统一取第一个值。
function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

// 将后端传入的确定页面名称转换为真实路由；未配置的名称不跳转。
function normalizeEntryRoutePath(raw) {
  if (raw == null || raw === "") return "";
  try {
    return ENTRY_ROUTE_MAP[decodeURIComponent(String(raw)).trim()] || "";
  } catch {
    return ENTRY_ROUTE_MAP[String(raw).trim()] || "";
  }
}

// 解析入口 path 跳转，并从 query 中移除 path，避免跳转后重复触发。
function resolveEntryRouteRedirect(to, query = to.query) {
  const value = firstQueryValue(query[ENTRY_ROUTE_QUERY_KEY]);
  if (value == null || String(value).trim() === "") return null;

  const targetPath = normalizeEntryRoutePath(value);
  if (!targetPath) return null;

  const nextQuery = { ...query };
  delete nextQuery[ENTRY_ROUTE_QUERY_KEY];

  return {
    path: targetPath,
    query: nextQuery,
    hash: to.hash,
    replace: true,
  };
}

// code 清理后优先处理入口 path；没有 path 时回到当前路由。
function resolveCleanRouteLocation(to, query) {
  const entryRouteRedirect = resolveEntryRouteRedirect(to, query);
  if (entryRouteRedirect) return entryRouteRedirect;
  return { path: to.path, query, hash: to.hash, replace: true };
}

// OAuth 跳转前保存的返回地址，回调完成后恢复，并清掉一次性认证参数。
function consumeAuthReturnLocation() {
  const saved = sessionStorage.getItem(RETURN_URL_KEY);
  if (!saved) return null;
  sessionStorage.removeItem(RETURN_URL_KEY);

  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = new URL(saved, window.location.origin);
    let path = url.pathname;

    if (path.includes("/redirect")) return null;
    if (base && path.startsWith(base)) {
      path = path.slice(base.length) || "/";
    }
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    url.searchParams.delete("code");
    url.searchParams.delete("_authHandled");
    url.searchParams.delete("_authCode");
    url.searchParams.delete("_authStage");
    url.searchParams.delete("state");

    const query = {};
    url.searchParams.forEach((value, key) => {
      if (query[key] === undefined) {
        query[key] = value;
      } else if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    });

    return { path, query, hash: url.hash, replace: true };
  } catch {
    return null;
  }
}

/**
 * 企微从应用入口打开时，code 在业务页 URL 上（如 mobileApproval?code=xxx）。
 * 只在 URL 带 code 时换 token；不主动发起 OAuth，避免线上入口来回跳转。
 */
router.beforeEach(async (to) => {
  if (to.meta?.public) return true;

  // 没有企微 code 时，只处理入口 path 跳转。
  const code =
    to.query.code != null && String(to.query.code) !== ""
      ? String(to.query.code)
      : "";
  const entryRouteRedirect = resolveEntryRouteRedirect(to);
  if (!code) {
    if (entryRouteRedirect) return entryRouteRedirect;
    return true;
  }

  // pcenter 回调通过 _authStage/state/sessionStorage 判断；否则按主系统登录处理。
  const queryStage = String(to.query._authStage || "");
  const stateStage =
    String(to.query.state || "") === AUTH_STAGE_PCENTER
      ? AUTH_STAGE_PCENTER
      : "";
  const authStage =
    queryStage || stateStage || sessionStorage.getItem(AUTH_STAGE_KEY) || "";
  console.log("[router-auth] code callback", {
    codeLen: code.length,
    queryStage,
    state: to.query.state,
    sessionStage: sessionStorage.getItem(AUTH_STAGE_KEY),
    authStage,
  });

  // 避免同一个 code 因 replace 后再次进入守卫时重复换 token。
  if (
    to.query._authHandled === "1" &&
    to.query._authCode === code &&
    String(to.query._authStage || "") === authStage
  ) {
    if (entryRouteRedirect) return entryRouteRedirect;
    return true;
  }

  const nextQuery = {
    ...to.query,
    _authHandled: "1",
    _authCode: code,
    _authStage: authStage,
  };
  setAuthCodeHandling(true);
  try {
    // 第二阶段：换取 pcenter token，完成后恢复返回地址或处理入口 path。
    if (authStage === AUTH_STAGE_PCENTER) {
      await getPcenterTokenByCode(code);
      sessionStorage.removeItem(AUTH_STAGE_KEY);
      sessionStorage.removeItem(AUTH_ERROR_KEY);
      const returnLocation = consumeAuthReturnLocation();
      if (returnLocation) return returnLocation;
      delete nextQuery.code;
      delete nextQuery._authCode;
      delete nextQuery._authStage;
      delete nextQuery.state;
      return resolveCleanRouteLocation(to, nextQuery);
    }

    // 第一阶段：只换取主系统 auth_token；pcenter OAuth 延迟到点击业务单据时触发。
    await getAuthTokenByCode(code);
    sessionStorage.removeItem(AUTH_ERROR_KEY);
    delete nextQuery.code;
    delete nextQuery._authCode;
    delete nextQuery._authStage;
    delete nextQuery.state;
    return resolveCleanRouteLocation(to, nextQuery);
  } catch (e) {
    console.error("[router] code 换 token 失败", e?.message || e, e);
    sessionStorage.setItem(
      AUTH_ERROR_KEY,
      JSON.stringify({
        stage: authStage || "main",
        message: e?.message || String(e),
        time: new Date().toISOString(),
      }),
    );
  } finally {
    setAuthCodeHandling(false);
  }

  // 换 token 失败时也清掉 URL 上的一次性 code，避免刷新后反复重试。
  if (isAuthDebugEnabled(to.query)) {
    console.warn("[router-auth] debugAuth=1, keep current URL after auth error");
    return true;
  }
  try {
    const returnLocation = consumeAuthReturnLocation();
    if (returnLocation) return returnLocation;
    delete nextQuery.code;
    delete nextQuery._authCode;
    delete nextQuery._authStage;
    delete nextQuery.state;
  } catch {
    // ignore
  }
  return resolveCleanRouteLocation(to, nextQuery);
});

// 路由标题只做一次普通设置，复杂 WebView 兜底逻辑已移除。
router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title;
  }
});

export default router;
export { PAGE_BASE, ROUTES };
