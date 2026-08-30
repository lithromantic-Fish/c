import { ROUTES } from '@/constants/routes'

/** 路由守卫换 code 过程中，避免业务 401 误触发 goToLogin */
let authCodeHandling = false

export function isAuthCodeHandling() {
  return authCodeHandling
}

export function setAuthCodeHandling(value) {
  authCodeHandling = value
}

/** 从 Vue route 或 window.location 读取企微 OAuth code */
export function extractOAuthCode(route) {
  const fromRoute = route?.query?.code
  if (fromRoute != null && String(fromRoute) !== '') {
    return String(fromRoute)
  }
  if (typeof window === 'undefined') return ''
  const fromSearch = new URLSearchParams(window.location.search).get('code')
  return fromSearch ? String(fromSearch) : ''
}

export function hasAuthToken() {
  if (typeof localStorage === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

export function getAuthToken() {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem('auth_token') || ''
  } catch {
    return ''
  }
}

/** redirect 时保留 query（尤其 code），避免 / → 首页 把 code 弄丢 */
export function redirectPreserveQuery(fallbackPath) {
  return (to) => ({
    path: fallbackPath,
    query: to.query,
    hash: to.hash,
  })
}

export { ROUTES }
