import http from "@/api/http";

const BASE = "/api/process-center/agency";

export function fetchProxyList(params = {}) {
  return http.post(`${BASE}/query`, {
    agentId: "",
    workFlowCode: "",
    pageNum: 1,
    pageSize: 10,
    startTimeState: "",
    startTimeBegin: "",
    startTime: "",
    endTimeState: "",
    endTimeBegin: "",
    endTime: "",
    ...params,
  });
}

export function addProxy(payload) {
  return http.post(`${BASE}/addAgency`, payload);
}

export function updateProxy(payload) {
  return http.post(`${BASE}/updateAgency`, payload);
}

export function removeProxies(objectIds) {
  return http.post(`${BASE}/removeAgencys`, { objectIds });
}

export function fetchProxyWorkflows() {
  return http.get(`${BASE}/queryWorkFlow`);
}
