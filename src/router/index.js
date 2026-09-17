import { createRouter, createWebHistory } from "vue-router";
import {
  getAuthTokenByCode,
  getPcenterTokenByCode,
  redirectToQywxOAuth,
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
  ProxyFilter: ROUTES.proxyFilter,
  ProxyForm: ROUTES.proxyForm,
  Nosupported: ROUTES.nosupported,
};

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

// 再次 OAuth 的返回地址：保留业务 query，去掉一次性认证参数。
function getCleanRouteFullPath(to) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}${to.path}`, window.location.origin);
  Object.entries(to.query).forEach(([key, value]) => {
    if (value == null) return;
    const list = Array.isArray(value) ? value : [value];
    list.forEach((item) => url.searchParams.append(key, String(item)));
  });
  url.searchParams.delete("code");
  url.searchParams.delete("_authHandled");
  url.searchParams.delete("_authCode");
  url.searchParams.delete("_authStage");
  url.searchParams.delete("state");
  url.hash = to.hash || "";
  return `${url.pathname}${url.search}${url.hash}`;
}

function setDocumentTitle(title) {
  if (!title) return;
  document.title = title;
}

// iOS 企微 WebView 回到前台后会丢标题，重新按当前路由补一次。
function syncCurrentRouteTitle() {
  setDocumentTitle(router.currentRoute.value?.meta?.title);
}

/**
 * 企微从应用入口打开时，code 在业务页 URL 上（如 mobileApproval?code=xxx）。
 * 只在 URL 带 code 时换 token；不主动发起 OAuth，避免线上入口来回跳转。
 */
router.beforeEach(async (to) => {
  setDocumentTitle(to.meta?.title);
  if (to.meta?.public) return true;

  const code =
    to.query.code != null && String(to.query.code) !== ""
      ? String(to.query.code)
      : "";
  const entryRouteRedirect = resolveEntryRouteRedirect(to);
  console.log('entryRouteRedirect',entryRouteRedirect);

  if (!code) {
    if (entryRouteRedirect) return entryRouteRedirect;
    return true;
  }

  const queryStage = String(to.query._authStage || "");
  console.log('queryStage',queryStage);

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

    await getAuthTokenByCode(code)

    // 主 token 成功后，准备进入 pcenter 认证阶段
    sessionStorage.removeItem(AUTH_ERROR_KEY)
    sessionStorage.setItem(
      AUTH_STAGE_KEY,
      AUTH_STAGE_PCENTER
    )

    // 再次 OAuth，获得用于 pcenter 的新 code
    redirectToQywxOAuth(getCleanRouteFullPath(to), {
      state: AUTH_STAGE_PCENTER,
    })

    return false

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

router.afterEach((to) => {
  setDocumentTitle(to.meta?.title);
});

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", syncCurrentRouteTitle);
  window.addEventListener("focus", syncCurrentRouteTitle);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncCurrentRouteTitle();
  });
}

export default router;
export { PAGE_BASE, ROUTES };
