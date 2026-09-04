import { reactive, ref } from "vue";
import { fetchDeptTree } from "@/api/process";
import { fetchProxyWorkflows } from "@/api/proxy";

export const PROXY_SCOPE_ALL = "all";
export const PROXY_SCOPE_PARTIAL = "partial";

export const proxyPeople = ref([]);
export const proxyDepartmentTree = ref([]);
export const proxyFlowOptions = ref([]);
export const proxyFlowTree = ref([]);
export const proxyRecords = ref([]);

export const proxyFilterState = reactive({
  agentId: "",
  agentName: "",
  scope: "",
  workflowCode: "",
  workflowName: "",
  startDate: "",
  endDate: "",
});

export function hasProxyFilter() {
  return Object.values(proxyFilterState).some((value) => String(value || "").trim());
}

function splitValues(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function unwrapProxyPayload(response) {
  if (response == null || typeof response !== "object") return response;
  if (Array.isArray(response) || "rows" in response || "total" in response) return response;
  const inner = response.data;
  if (inner && typeof inner === "object") {
    if (Array.isArray(inner) || "rows" in inner || "total" in inner) return inner;
    if (inner.data != null) return inner.data;
  }
  return inner ?? response;
}

export function assertProxySuccess(response, fallbackMessage) {
  const status = String(response?.status ?? response?.code ?? "");
  if (status !== "200" && status !== "0") {
    throw new Error(response?.message || fallbackMessage);
  }
  return response;
}

export function mapProxyRecord(row = {}, index = 0) {
  const isAll = Number(row.isAllWorkflow) === 999;
  const objectIds = splitValues(row.objectIds || row.objectId);
  const flowCodes = splitValues(
    row.workFlowCodes || row.workflowCodes || row.workFlowCode || row.workflowCode,
  );
  const flows = isAll ? [] : splitValues(row.workflowName || row.workFlowName);
  const statusText = String(row.status || "");
  return {
    id: objectIds[0] || String(row.sortBy || `${row.agentId || "proxy"}-${index}`),
    objectIds,
    principal: row.userName || row.originatorName || "",
    principalId: row.userId || row.originator || "",
    agentId: row.agentId || "",
    agentName: row.agentName || "",
    scope: isAll ? PROXY_SCOPE_ALL : PROXY_SCOPE_PARTIAL,
    flows,
    flowCodes,
    startDate: row.startTime || "",
    endDate: row.endTime || "",
    status: statusText.includes("结束") ? "ended" : "active",
    statusText: statusText || "进行中",
    avatarTone: "letter",
    raw: row,
  };
}

export function setProxyRecords(records) {
  proxyRecords.value = records;
}

export function appendProxyRecords(records) {
  proxyRecords.value.push(...records);
}

export function setProxyPeople(tree = []) {
  const people = [];
  const seen = new Set();
  proxyDepartmentTree.value = tree.map((dept) => {
    const users = (dept.userBooks || dept.users || []).map((user) => {
      const id = String(user.usercode || user.userCode || user.id || "");
      const name = user.username || user.userName || user.name || "";
      const person = {
        id,
        name,
        deptName: dept.deptName || dept.name || "",
      };
      if (id && name && !seen.has(id)) {
        seen.add(id);
        people.push(person);
      }
      return person;
    }).filter((person) => person.id && person.name);
    return {
      name: dept.deptName || dept.name || "",
      users,
    };
  }).filter((dept) => dept.name && dept.users.length);
  proxyDepartmentTree.value.forEach((dept) => {
    dept.users.forEach((person) => {
      if (!seen.has(person.id)) {
        seen.add(person.id);
        people.push(person);
      }
    });
  });
  proxyPeople.value = people;
  return people;
}

let proxyPeoplePromise = null;

export async function ensureProxyPeople() {
  if (proxyPeople.value.length) return proxyPeople.value;
  if (!proxyPeoplePromise) {
    proxyPeoplePromise = fetchDeptTree(2)
      .then((response) => setProxyPeople(unwrapProxyPayload(response) || []))
      .finally(() => {
        proxyPeoplePromise = null;
      });
  }
  return proxyPeoplePromise;
}

function normalizeWorkflowNode(item, depth = 1) {
  if (!item || typeof item !== "object" || depth > 3) return null;
  const code =
    item.processClassificationCode ||
    item.workflowCode ||
    item.workFlowCode ||
    item.code ||
    item.value;
  const name =
    item.processClassificationName ||
    item.workflowName ||
    item.workFlowName ||
    item.name ||
    item.text;
  const children = (item.children || item.childList || [])
    .map((child) => normalizeWorkflowNode(child, depth + 1))
    .filter(Boolean);
  if (!code || !name) return null;
  return { code: String(code), name: String(name), children, depth };
}

function collectSelectableFlows(nodes, result = []) {
  nodes.forEach((node) => {
    if (node.children.length) collectSelectableFlows(node.children, result);
    else result.push({ code: node.code, name: node.name });
  });
  return result;
}

export function setProxyFlowOptions(payload) {
  const source = Array.isArray(payload) ? payload : payload?.rows || [];
  proxyFlowTree.value = source
    .map((item) => normalizeWorkflowNode(item))
    .filter(Boolean);
  const seen = new Set();
  proxyFlowOptions.value = collectSelectableFlows(proxyFlowTree.value).filter((flow) => {
    if (seen.has(flow.code)) return false;
    seen.add(flow.code);
    return true;
  });
  return proxyFlowOptions.value;
}

let proxyFlowsPromise = null;

export async function ensureProxyFlows() {
  if (proxyFlowOptions.value.length) return proxyFlowOptions.value;
  if (!proxyFlowsPromise) {
    proxyFlowsPromise = fetchProxyWorkflows()
      .then((response) => {
        assertProxySuccess(response, "获取流程失败");
        return setProxyFlowOptions(unwrapProxyPayload(response) || []);
      })
      .finally(() => {
        proxyFlowsPromise = null;
      });
  }
  return proxyFlowsPromise;
}

export function getProxyRecord(id) {
  return proxyRecords.value.find((record) => record.id === id) || null;
}

export function deleteProxyRecord(id) {
  const index = proxyRecords.value.findIndex((record) => record.id === id);
  if (index < 0) return false;
  proxyRecords.value.splice(index, 1);
  return true;
}

export function resetProxyFilter() {
  proxyFilterState.agentId = "";
  proxyFilterState.agentName = "";
  proxyFilterState.scope = "";
  proxyFilterState.workflowCode = "";
  proxyFilterState.workflowName = "";
  proxyFilterState.startDate = "";
  proxyFilterState.endDate = "";
}
