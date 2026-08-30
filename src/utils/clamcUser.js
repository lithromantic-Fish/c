const CLAMC_USER_KEY = 'clamc_user'

/** 与壳 / 路由守卫写入的 clamc_user 一致（纯字符串昵称） */
export function getClamcUserDisplayName(fallback = '用户') {
  try {
    const raw = localStorage.getItem(CLAMC_USER_KEY)
    if (!raw) return fallback
    if (raw.charAt(0) !== '{') {
      const plain = String(raw).trim()
      if (plain) return plain
      return fallback
    }
    const parsed = JSON.parse(raw)
    const name = parsed?.USER_INFO?.name ?? parsed?.name
    if (name != null && String(name).trim() !== '') return String(name).trim()
  } catch {
    /* ignore */
  }
  return fallback
}
