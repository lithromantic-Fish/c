<template>
  <div class="redirect-page">
    <p>企业微信认证</p>
    <p class="msg">{{ msg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuthTokenByCode, redirectToQywxOAuthByRedirectPage } from '@/utils/authRedirect'
import { extractOAuthCode, hasAuthToken } from '@/utils/oauth'
import { ROUTES } from '@/constants/routes'

const msg = ref('处理中...')
const router = useRouter()

const RETURN_URL_KEY = 'wf_return_url'
const DEFAULT_RETURN = ROUTES.mobileApproval

function getSafeReturnPath() {
  const saved = sessionStorage.getItem(RETURN_URL_KEY)
  sessionStorage.removeItem(RETURN_URL_KEY)
  if (!saved || saved.includes('/redirect')) return DEFAULT_RETURN
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (saved.startsWith('http')) {
    try {
      const url = new URL(saved)
      const path = url.pathname.startsWith(base)
        ? url.pathname.slice(base.length)
        : url.pathname
      return path + url.search
    } catch {
      return DEFAULT_RETURN
    }
  }
  const path = saved.startsWith(base) ? saved.slice(base.length) : saved
  return path.startsWith('/') ? path : `/${path}`
}

onMounted(async () => {
  const code = extractOAuthCode(router.currentRoute.value)

  if (!code) {
    if (hasAuthToken()) {
      msg.value = '已登录，正在进入首页...'
      router.replace(DEFAULT_RETURN)
      return
    }
    msg.value = '没有获取到 code，准备重新授权...'
    redirectToQywxOAuthByRedirectPage(getSafeReturnPath())
    return
  }

  msg.value = `已收到 code，正在换取登录态...`
  try {
    await getAuthTokenByCode(code)
    msg.value = '认证成功，正在跳转...'
    const target = getSafeReturnPath()
    router.replace(target)
  } catch (e) {
    msg.value = `认证失败: ${e?.message || e}。请关闭后从企微工作台重新进入。`
    console.error('[Redirect] auth failed', e)
  }
})
</script>

<style scoped>
.redirect-page {
  padding: 24px 16px;
  font-size: 16px;
  color: #323233;
  line-height: 1.6;
}
.msg {
  margin-top: 12px;
  font-size: 14px;
  color: #969799;
  word-break: break-all;
}
</style>
