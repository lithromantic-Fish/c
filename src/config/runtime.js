import systemConfig from "./systemconfig";

/**
 * 默认使用静态 systemconfig；嵌入宿主时可设 window.config / window.systconfig 覆盖
 */
export function getAppConfig() {
  if (typeof window === "undefined") {
    return { ...systemConfig };
  }
  const fromWindow = window.config || window.systconfig || {};
  return { ...systemConfig, ...fromWindow };
}
