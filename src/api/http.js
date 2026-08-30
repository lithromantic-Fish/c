/**
 * 原生 axios 封装（替代公司模板 helper/http.js 的 $q.defer + requestHandle）
 * 保证 iOS 企微 WebView 下 Promise 能正常 resolve，业务接口可拿到回调数据。
 */
import axios from 'axios'
import { clearAuth, redirectToQywxOAuth } from '@/utils/authRedirect'
import {
  getAuthToken,
  isAuthCodeHandling,
} from '@/utils/oauth'

const AUTH_ERROR_CODES = ['40102', '40103']
let authRedirecting = false

const http = axios.create({
  baseURL: '',
  timeout: 60000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = token
  }
  return config
})

function getResponseCode(data) {
  const code = data?.code ?? data?.status
  return code == null ? '' : String(code)
}

function isAuthApi(config) {
  return String(config?.url || '').includes('/auth-support/jwt/qywx-verify')
}

function getCleanReturnPath() {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('_authHandled')
  url.searchParams.delete('_authCode')
  return url.pathname + url.search + url.hash
}

function redirectToAuth(config) {
  if (authRedirecting || isAuthCodeHandling() || isAuthApi(config)) {
    return
  }
  authRedirecting = true
  console.warn('[http-auth] redirect to qywx oauth', {
    fromApi: config?.url,
    returnPath: getCleanReturnPath(),
  })
  clearAuth()
  redirectToQywxOAuth(getCleanReturnPath())
}

http.interceptors.response.use(
  (res) => {
    const data = res.data
    if (AUTH_ERROR_CODES.includes(getResponseCode(data))) {
      redirectToAuth(res.config)
      return Promise.reject(data)
    }
    return data
  },
  (err) => {
    const status = err.response?.status
    const code = getResponseCode(err.response?.data)
    if (status === 401 || AUTH_ERROR_CODES.includes(code)) {
      redirectToAuth(err.config)
    }
    return Promise.reject(err)
  },
)

export default http
