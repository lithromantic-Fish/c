<template>
  <div class="login-page">
    <div v-if="showUserinfo" class="userinfo">
      <div class="info-item">
        <img class="userinfo-avatar" src="" alt="" />
        <span class="userinfo-nickname"></span>
      </div>
    </div>

    <div class="title">申请获取以下权限</div>
    <div class="content">获得你的公开信息(昵称，头像，手机等)</div>

    <div class="usermotto">
      <van-button
        type="primary"
        block
        round
        class="sub-btn"
        :loading="loading"
        @click="OAuth2Login"
      >
        授权登录
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Cookie from 'js-cookie'
import { showToast } from 'vant'
import { getAppConfig } from '@/config/runtime'
import { ROUTES } from '@/constants/routes'

const route = useRoute()
const router = useRouter()

const showUserinfo = ref(false)
const authCode = ref('')
const loading = ref(false)

function getConfig() {
  return getAppConfig()
}

/** 兼容 hash 路由下企微回调可能带的 code */
function extractCodeFromLocation() {
  const q = route.query.code
  if (q != null && String(q) !== '') return String(q)
  const href = typeof window !== 'undefined' ? window.location.href : ''
  const m = href.match(/[?&#]code=([^&#]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

function OAuth2Login() {
  const config = getConfig()
  const wxCorpId = config.wxCorpId || config.appid || config.appId
  const loginIp = config.loginIp
  const redirectUrl = config.redirectUrl

  if (!wxCorpId || !loginIp || !redirectUrl) {
    showToast('请在 window.config 中配置 wxCorpId、loginIp、redirectUrl')
    console.error(
      '[Login] 缺少 OAuth 配置：wxCorpId、loginIp、redirectUrl（redirectUrl 为授权完成回跳地址，需与企微后台一致）',
    )
    return
  }

  const authUrl =
    `http://${loginIp}/connect/oauth2/authorize` +
    `?appid=${encodeURIComponent(wxCorpId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&response_type=code` +
    `&scope=snsapi_base` +
    `&state=STATE` +
    `#wechat_redirect`

  window.location.replace(authUrl)
}

async function validateCode() {
  const config = getConfig()
  const prefix = config.prefix || "";
  const code = authCode.value || extractCodeFromLocation()

  if (!code) {
    showToast('缺少授权 code')
    return
  }

  loading.value = true
  try {
    const res = await axios.get(`${prefix}/api/wxUserInfo`, {
      params: { code, state: 'STATE' },
      timeout: 15000,
    })

    const body = res.data
    if (body?.code == 200) {
      const token = body.data?.userToken
      if (!token) {
        showToast('登录失败：未返回 token')
        return
      }
      Cookie.set('token', token)
      localStorage.setItem('auth_token', token)
      showToast('登录成功')
      setTimeout(() => {
        router.replace(ROUTES.mobileApproval)
      }, 100)
    } else {
      showToast(body?.message || '登录失败')
    }
  } catch {
    showToast('服务器异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const hasToken =
    Cookie.get('token') || localStorage.getItem('auth_token')
  if (hasToken) {
    router.replace(ROUTES.mobileApproval)
    return
  }

  const code = extractCodeFromLocation()
  if (code) {
    authCode.value = code
    validateCode()
  } else {
    OAuth2Login()
  }
})
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: var(--page-bg);
  padding: 0 16px;
  box-sizing: border-box;
}

.userinfo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
}

.info-item {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 42px;
}

.userinfo-avatar {
  width: 128px;
  height: 128px;
  margin: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.userinfo-nickname {
  color: #aaa;
}

.title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 20px;
  margin-top: 24px;
  color: #020e0f;
}

.content {
  font-size: 28px;
  color: #666666;
  text-align: center;
  line-height: 1.5;
}

.usermotto {
  margin-top: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sub-btn {
  width: 80%;
  max-width: 320px;
  margin: 24px auto 0;
}
</style>
