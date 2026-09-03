import http from '@/api/http'
const BASE = '/api/process-center/commissionTask'
const REMINDER_BASE = '/api/process-center/reminderMessage'

/**
 * 兼容 { status, data } / { code, data } / 直接数字段 等多种后端包裹
 */
export function unwrapApiData(res) {
  if (res == null || typeof res !== 'object') return res
  if ('unfinishedWorkItemCount' in res || 'rows' in res || 'total' in res) return res
  const inner = res.data
  if (inner && typeof inner === 'object') {
    if ('unfinishedWorkItemCount' in inner || 'rows' in inner || 'total' in inner) return inner
    const nested = inner.data
    if (nested && typeof nested === 'object') return nested
  }
  return res
}

/** 首页待办总数 GET（与 workflow_center_ui Home.vue 一致） */
export function fetchHomeWorkCount(params) {
  return http.get(`${BASE}/queryWorkCount/v2`, { params })
}

/** 获取超时催办提醒开关：data 为字符串 "0" / "1" */
export function fetchReminderSetting() {
  return http.get(`${REMINDER_BASE}/get/v1`)
}

/** 设置超时催办提醒开关：0 关闭，1 开启 */
export function updateReminderSetting(flag) {
  return http.get(`${REMINDER_BASE}/update/v1`, {
    params: { flag: flag ? 1 : 0 },
  })
}

/** 四 Tab 角标 GET（后端使用 queryWorkCount/v2 返回四类数量） */
export function fetchCommissionTabCounts(params) {
  return http.get(`${BASE}/queryWorkCount/v2`, {
    params: {
      pageNum: 1,
      pageSize: 10,
      parentworkflowcode: '',
      workflowcode: '',
      instanceName: '',
      founderName: '',
      startTime: '',
      endTime: '',
      ...params,
      device: 'APP',
    },
  })
}

export const UPDATE_READED_PROCESS_TYPE = {
  unread: 1,
  read: 2,
}

export function updateReadedProcess(objectId, processType) {
  return http.get(`${BASE}/updateReadedProcess/v2`, {
    params: { objectId, processType },
  })
}

export function fetchTaskList(params) {
  return http.post(`${BASE}/queryCommissionTaskList/v2`, {
    pageNum: 1,
    pageSize: 10,
    parentworkflowcode: '',
    workflowcode: '',
    instanceName: '',
    founderName: '',
    startTime: '',
    endTime: '',
    ...params,
    device: 'APP',
  })
}

export function fetchAlreadyHandleList(params) {
  return http.post(`${BASE}/queryAlreadyHandleList/v2`, {
    pageNum: 1,
    pageSize: 10,
    parentworkflowcode: '',
    workflowcode: '',
    instanceName: '',
    founderName: '',
    startTime: '',
    endTime: '',
    ...params,
    device: 'APP',
  })
}

export function fetchUnReadProcessList(params) {
  return http.post(`${BASE}/queryUnReadProcessSize/v2`, {
    pageNum: 1,
    pageSize: 10,
    parentworkflowcode: '',
    workflowcode: '',
    instanceName: '',
    founderName: '',
    startTime: '',
    endTime: '',
    ...params,
    device: 'APP',
  })
}

export function fetchReadProcessList(params) {
  return http.post(`${BASE}/queryReadProcessList/v2`, {
    pageNum: 1,
    pageSize: 10,
    parentworkflowcode: '',
    workflowcode: '',
    instanceName: '',
    founderName: '',
    startTime: '',
    endTime: '',
    ...params,
    device: 'APP',
  })
}

const CATEGORY_SIZE_PATH = {
  todo: '/queryCommissionTaskSize/v2',
  done: '/queryAlreadyHandleSize/v2',
  unread: '/queryUnReadProcessSize/v2',
  read: '/queryReadProcessSize/v2',
}

export function fetchCategoryTreeByTab(tabKey = 'todo') {
  const path = CATEGORY_SIZE_PATH[tabKey] || CATEGORY_SIZE_PATH.todo
  return http.get(`${BASE}${path}`)
}

export const fetchCategoryTree = () => fetchCategoryTreeByTab('todo')

export function fetchDeptTree(companyId = 2) {
  return http.get('/api/auth-user-center/dept/tree/v1', { params: { companyId } })
}
