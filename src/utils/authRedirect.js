import axios from "axios";
import Cookie from "js-cookie";
import { sm4 } from "sm-crypto";
import { showToast } from "vant";
import { getAppConfig } from "@/config/runtime";
import { setStorage, removeStorage } from "@/utils/storage";
import { ROUTES } from "@/constants/routes";
import {
  extractOAuthCode,
  hasAuthToken,
  isAuthCodeHandling,
} from "@/utils/oauth";

export const LOGIN_PATH = ROUTES.login;

const ENTRY_ROUTE_NAME_BY_PATH = {
  [ROUTES.mobileApproval]: "mobileApproval",
  [ROUTES.index]: "index",
  [ROUTES.climbProcess]: "climbProcess",
  [ROUTES.advancedFilter]: "AdvancedFilter",
  [ROUTES.nosupported]: "Nosupported",
};

const CORP = {
  corpId: "ww53ecb42f7fb2166c",
  agentId: "1000071",
  secret: "lmwgaQn4k60plxzv2A9v31gzIoEwVzaURBrnPLcwQWQ",
  sm4Key: "b5db9edecc341ba55730e1119315fcec",
};

function getCorpInfo() {
  const cfg = getAppConfig();
  return {
    corpId: cfg.qywxCorpId || cfg.wxCorpId || CORP.corpId,
    agentId: cfg.qywxAgentId || CORP.agentId,
    secret: cfg.qywxSecret || CORP.secret,
    sm4Key: cfg.qywxSm4Key || CORP.sm4Key,
    oauthHost: (cfg.qywxOAuthHost || "https://wxlocal.clamc.com").replace(
      /\/$/,
      "",
    ),
  };
}

function resolveReturnEntryRouteName(returnPath) {
  if (!returnPath) return "";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = new URL(returnPath, origin || "http://localhost");
    const explicitPath = url.searchParams.get("path");
    if (explicitPath) return explicitPath;

    let path = url.pathname;
    if (base && path.startsWith(base)) {
      path = path.slice(base.length) || "/";
    }
    return ENTRY_ROUTE_NAME_BY_PATH[path] || "";
  } catch {
    return "";
  }
}

export function maskToken(token, tail = 8) {
  if (!token) return "EMPTY";
  const s = String(token);
  if (s.length <= tail) return `***${s}`;
  return `len=${s.length}, tail=${s.slice(-tail)}`;
}

export function redirectToQywxOAuth(returnPath, options = {}) {
  const cfg = getAppConfig();
  const { corpId, oauthHost } = getCorpInfo();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const redirectUrl = cfg.redirectUrl || `${origin}${base}${ROUTES.mobileApproval}`;
  const redirect = new URL(redirectUrl, origin);
  Object.entries(options.redirectQuery || {}).forEach(([key, value]) => {
    if (value != null && value !== "") {
      redirect.searchParams.set(key, String(value));
    }
  });
  const entryRouteName = resolveReturnEntryRouteName(returnPath);
  if (entryRouteName && !redirect.searchParams.has("path")) {
    redirect.searchParams.set("path", entryRouteName);
  }
  const state = options.state || "STATE";
  const loginUrl =
    `${oauthHost}/connect/oauth2/authorize` +
    `?appid=${encodeURIComponent(corpId)}` +
    `&redirect_uri=${encodeURIComponent(redirect.toString())}` +
    `&response_type=code` +
    `&scope=snsapi_base` +
    `&state=${encodeURIComponent(state)}` +
    `#wechat_redirect`;
  if (returnPath) {
    sessionStorage.setItem("wf_return_url", returnPath);
  }
  window.location.replace(loginUrl);
}

export const getPcenterTokenByCode = async (code) => {
  const cfg = getAppConfig();
  const prefix = cfg.prefix || "";
  const url = `${prefix}/api/wxUserInfo`;
  console.log("[pcenter-auth] request", {
    url,
    codeLen: String(code).length,
    prefix,
  });

  try {
    const { data } = await axios.get(url, {
      params: { code, state: "STATE" },
      timeout: 15000,
    });
    console.log("[pcenter-auth] response", {
      code: data?.code,
      message: data?.message,
      hasToken: !!data?.data?.userToken,
    });

    if (data?.code == 200 && data?.data?.userToken) {
      const token = data.data.userToken;
      Cookie.set("token", token);
      sessionStorage.setItem("pc_token", token);
      return token;
    }

    const bizErr = new Error(data?.message || "获取 pcenter token 失败");
    bizErr.response = { data, status: 200, config: { url } };
    throw bizErr;
  } catch (e) {
    console.error("[pcenter-auth] failed", e?.message || e, e?.response?.data || e);
    throw e;
  }
};

export const getAuthTokenByCode = async (code) => {
  const { corpId, agentId, secret: qywxSecret, sm4Key } = getCorpInfo();
  const paramStr = `${corpId}￥${qywxSecret}￥${agentId}`;
  const key = sm4Key || CORP.sm4Key;
  const encryptedToken = sm4.encrypt(paramStr, key);
  const params = {
    code,
    token: encryptedToken,
  };
  console.log("[main-auth] request", {
    url: "/api/auth-support/jwt/qywx-verify/v1",
    codeLen: String(code).length,
    corpId,
    agentId,
    hasSecret: !!qywxSecret,
    hasSm4Key: !!key,
  });
  const { data } = await axios({
    url: "/api/auth-support/jwt/qywx-verify/v1",
    method: "post",
    data: params,
  });
  console.log("[main-auth] response", {
    code: data?.code,
    message: data?.message,
    hasToken: !!data?.result?.authToken,
  });

  if (data.code === "0" && data.result && data.result.authToken) {
    const authToken = data.result.authToken;
    setStorage("auth_token", authToken);
    setStorage("refresh_token", data.result.refreshToken);
    setStorage("refresh_token_expire_time", data.result.refreshExpireTime);
    setStorage("clamc_user", data.result.user.name);
    return authToken;
  } else {
    throw new Error(data.message || "获取 authToken 失败");
  }
};

export function clearAuth() {
  Cookie.remove("token");
  removeStorage("auth_token");
  removeStorage("refresh_token");
  removeStorage("refresh_token_expire_time");
  removeStorage("clamc_user");
}

/**
 * 401 时仅提示，不跳转 Redirect（入口 URL 自带 code，应在当前页守卫里换 token）
 */
export function goToLogin(message = "登录已过期，请从企微工作台重新打开") {
  if (isAuthCodeHandling()) return;
  if (extractOAuthCode()) return;
  if (!hasAuthToken()) return;
  clearAuth();
  showToast(message);
}
