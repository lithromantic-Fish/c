import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://c-test.clamc.com/api',
  timeout: 15000
})

request.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err)
)

const BASE = '/process-center/commissionTask'

/**
 * 待办列表
 * @param {object} params
 *  - pageNum, pageSize
 *  - parentworkflowcode  分类 code（顶层或子层都用这个字段）
 *  - workflowcode        子流程 code（可空）
 *  - instanceName        流程标题
 *  - founderName         创建人
 *  - startTime / endTime 创建时间区间
 *  - creatDayState       选了创建日期区间时传 10，否则不传
 *  - receiveDayState     选了接收日期区间时传 10，否则不传
 */
export const fetchTaskList = params =>
  request.post(`${BASE}/queryCommissionTaskList/v2`, {
    pageNum: 1,
    pageSize: 10,
    parentworkflowcode: '',
    workflowcode: '',
    instanceName: '',
    founderName: '',
    startTime: '',
    endTime: '',
    ...params,
    device: 'APP'
  })

/** 分类树（左侧菜单 + 高级筛选所属路径共用） */
export const fetchCategoryTree = () =>
  request.get(`${BASE}/queryCommissionTaskSize/v2`)

/** 部门人员树（高级筛选「创建人部门」和「创建人姓名」共用） */
export const fetchDeptTree = (companyId = 2) =>
  request.get('/auth-user-center/dept/tree/v1', { params: { companyId } })
