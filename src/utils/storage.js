export function setStorage(key, value) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, value == null ? '' : String(value))
}

export function getStorage(key) {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(key)
}

export function removeStorage(key) {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(key)
}
