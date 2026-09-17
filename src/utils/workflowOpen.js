import axios from "axios";
import Cookie from "js-cookie";
import { showToast } from "vant";
import { getAppConfig } from "@/config/runtime";
import { goToLogin } from "@/utils/authRedirect";

export function getQueryString(name, url) {
  if (!url) return null;
  const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
  const r = url.replace(/\?/, "&").substring(1).match(reg);
  if (r != null) return decodeURIComponent(r[2]);
  return null;
}

export async function getRedirectParamUserInfo(url, params, headers) {
  const res = await axios.post(url, params, {
    headers,
    timeout: 30000,
  });
  return {
    statusCode: res.status,
    status: res.status,
    data: res.data,
  };
}

function resolveOpenBasePath() {
  const cfg = getAppConfig();
  if (cfg.path != null && cfg.path !== "") {
    const p = String(cfg.path);
    return p.endsWith("/") ? p.slice(0, -1) : p;
  }
  return "";
}

function unwrapRedirectData(res) {
  let data = res?.data ?? res?.error ?? res;

  if (
    data &&
    typeof data === "object" &&
    data.data !== undefined &&
    data.returnUrl1 === undefined &&
    data.returnUrl === undefined
  ) {
    data = data.data;
  }

  return data;
}

function openRedirectUrl(data, params) {
  if (!data) return false;

  const basePath = resolveOpenBasePath();
  const returnPath = data.returnUrl1 ?? data.returnUrl;
  if (!returnPath) {
    showToast("未获取到跳转地址");
    return true;
  }
  let openUrl = basePath + returnPath;

  openUrl = openUrl.replace(/\$\{taskId\}/g, params.taskId || "");
  openUrl = openUrl.replace(
    /\$\{insFlowSerialNo\}/g,
    params.insFlowSerialNo || "",
  );
  openUrl = openUrl.replace(/\$\{formType\}/g, params.formType || "");
  openUrl = openUrl.replace(/\$\{noticeId\}/g, params.noticeId || "");
  openUrl = openUrl.replace(/\$\{instanceId\}/g, params.instanceId || "");
  openUrl = openUrl.replace(/\$\{source_flag\}/g, params.source_flag || "");

  window.location.href = openUrl;
  return true;
}

export async function requestUrlGet(params, url) {
  const cookie =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("auth_token")
      : null;
  const token = cookie || Cookie.get("token") || "";

  const header = {
    "content-type": "application/json",
    Cookie: `token=${token}`,
    accessToken: token,
  };

  if (url.indexOf("?") > -1) {
    url += `&token=${encodeURIComponent(token)}`;
  } else {
    url += `?token=${encodeURIComponent(token)}`;
  }

  params.device = "APP";

  try {
    const res = await getRedirectParamUserInfo(url, params, header);

    const status = res?.statusCode || res?.status;
    const data = unwrapRedirectData(res);

    if (status === 401) {
      goToLogin();
      return;
    }

    openRedirectUrl(data, params);
  } catch (err) {
    const status = err?.statusCode || err?.status || err?.response?.status;
    if (status === 401) {
      goToLogin();
    } else if (openRedirectUrl(unwrapRedirectData(err), params)) {
      console.warn(
        "getRedirectParamUserInfo resolved from rejected payload:",
        err,
      );
    } else {
      console.error("getRedirectParamUserInfo error:", err);
      showToast("跳转请求失败");
    }
  }
}

/**
 * 列表点击后：解析 formUrl 参数 → 请求 redirect 接口 → location 打开业务页
 * @param {string} formUrl
 * @param {string} id objectId
 */
export async function toDeal(formUrl, id) {
  const cfg = getAppConfig();
  const paramUrl = String(cfg.redirectParamUrl || "").trim();
  const token =
    Cookie.get("token") ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("auth_token")
      : null) ||
    "";

  if (String(id).indexOf("hundsun") > -1) {
    if (!formUrl) {
      showToast("缺少表单地址");
      return;
    }

    const insFlowSerialNo = getQueryString("insFlowSerialNo", formUrl) || "";
    const source_flag = getQueryString("source_flag", formUrl) || "";
    const systemType = getQueryString("systemType", formUrl) || "";
    const formType = getQueryString("formType", formUrl) || "";
    const taskId = getQueryString("taskId", formUrl) || "";
    const noticeId = getQueryString("noticeId", formUrl) || "";
    const instanceId = getQueryString("instanceId", formUrl) || "";

    if (!paramUrl) {
      console.error(
        "[workflowOpen] 请在 src/config/systemconfig.js 中配置 redirectParamUrl，或注入 window.config.redirectParamUrl",
      );
      showToast("未配置跳转接口地址");
      return;
    }

    const params = {
      insFlowSerialNo,
      source_flag,
      systemType:
        systemType !== "" && systemType != null ? `APP${systemType}` : "APP",
      formType,
      taskId: taskId || id || "",
      noticeId,
      instanceId,
      token,
    };

    await requestUrlGet(params, paramUrl);
    return;
  }

  const loginIp = cfg.loginIp || "wxlocal.clamc.com";
  const corpId = cfg.wxCorpId || cfg.qywxCorpId || "";
  if (String(formUrl || "").indexOf("clamc.com") > -1) {
    const url =
      `http://${loginIp}/connect/oauth2/authorize` +
      `?appid=${encodeURIComponent(corpId)}` +
      `&redirect_uri=${encodeURIComponent(formUrl)}`;
    window.location.assign(url);
    return;
  }

  const redirectOrigin = cfg.redirectOrigin || window.location.host;
  const url =
    `http://${loginIp}/connect/oauth2/authorize` +
    `?appid=${encodeURIComponent(corpId)}` +
    `&redirect_uri=${encodeURIComponent(
      `https://${redirectOrigin}/Portal/MobileMsgSheets.html?loginfrom=wechat_WorkItemID=${id}`,
    )}` +
    `&response_type=code` +
    `&scope=snsapi_base` +
    `&state=Mobile` +
    `#wechat_redirect`;
  window.location.assign(url);
}
