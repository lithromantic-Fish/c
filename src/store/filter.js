import { reactive } from 'vue'

/**
 * 列表筛选共享状态。
 * - parentworkflowcode：与列表接口一致（「全部」为父级 code，叶子为子级 code）
 * - parentworkflowname：分类胶囊短文案
 * - categoryPathName：所属路径完整展示「父 / 子」，与高级筛选一致
 * - advanced：高级筛选表单结果
 */
export const filterState = reactive({
  parentworkflowcode: '',
  parentworkflowname: '全部分类',
  categoryPathName: '全部分类 / 全部',
  advanced: null,
  /** 与 CLIMB 列表 Tab 一致，用于分类 / 所属路径 Size 接口：todo | done | unread | read */
  listTab: 'todo',
})

function isNonEmptyStr(s) {
  return s != null && String(s).trim() !== ''
}

/** 是否存在任一有效的高级筛选条件（决定筛选图标是否高亮、apply 是否写入 advanced） */
export function advancedHasConditions(adv) {
  if (!adv || typeof adv !== 'object') return false
  return (
    isNonEmptyStr(adv.title) ||
    isNonEmptyStr(adv.founderName) ||
    isNonEmptyStr(adv.founderCode) ||
    isNonEmptyStr(adv.deptName) ||
    isNonEmptyStr(adv.sequenceNo) ||
    !!(adv.parentworkflowcode || adv.workflowcode) ||
    isNonEmptyStr(adv.startTime) ||
    isNonEmptyStr(adv.endTime) ||
    isNonEmptyStr(adv.receiveStartDate) ||
    isNonEmptyStr(adv.receiveEndDate)
  )
}

/** 与列表胶囊文案一致：由完整路径推导 */
export function pillLabelFromPath(pathName, parentCode) {
  const path = (pathName || '').trim()
  if (!path || path === '全部分类') return '全部分类'
  const parts = path
    .split(' / ')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return '全部分类'
  if (
    parts[0] === '全部分类' &&
    (parts.length === 1 || parts[1] === '全部')
  ) {
    return '全部分类'
  }
  if (parts.length >= 2 && parts[1] === '全部') return parts[0]
  if (parts.length >= 2) return parts[parts.length - 1]
  return parts[0]
}

export function pickCategory(code, name, fullPath = null) {
  filterState.parentworkflowcode =
    code != null && code !== '' ? String(code) : ''
  filterState.parentworkflowname = name || '全部分类'
  if (fullPath != null && fullPath !== '') {
    filterState.categoryPathName = fullPath
  } else if (!code) {
    filterState.categoryPathName = '全部分类 / 全部'
  } else {
    filterState.categoryPathName =
      name && name !== '全部分类' ? `${name}` : '全部分类 / 全部'
  }
}

export function applyAdvanced(payload) {
  const next = payload && advancedHasConditions(payload) ? payload : null
  filterState.advanced = next

  if (payload && typeof payload === 'object') {
    const raw = payload.parentworkflowcode
    filterState.parentworkflowcode =
      raw != null && raw !== '' ? String(raw) : ''
    const pn = isNonEmptyStr(payload.pathName)
      ? String(payload.pathName).trim()
      : '全部分类 / 全部'
    filterState.categoryPathName = pn
    filterState.parentworkflowname = pillLabelFromPath(
      filterState.categoryPathName,
      filterState.parentworkflowcode,
    )
  }
}

export function resetFilter() {
  filterState.parentworkflowcode = ''
  filterState.parentworkflowname = '全部分类'
  filterState.categoryPathName = '全部分类 / 全部'
  filterState.advanced = null
}
