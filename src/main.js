import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Vant from 'vant'
import 'vant/lib/index.css'
import './styles/index.scss'

/** vConsole 不是 Vue 插件，必须 new VConsole()，不能 app.use(VConsole) */
function initVConsole() {
  const disabled =
    typeof window !== 'undefined' &&
    window.config &&
    window.config.enableVConsole === false
  const enabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_VCONSOLE === 'true' ||
    !disabled
  if (!enabled) return
  import('vconsole').then(({ default: VConsole }) => {
    if (!window.__VCONSOLE__) {
      window.__VCONSOLE__ = new VConsole({ theme: 'dark' })
      console.log('[vConsole] initialized')
    }
  })
}

function initGlobalErrorLog() {
  window.addEventListener('error', (e) => {
    console.error('[global error]', e.message, e.filename, e.lineno, e.error)
  })
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandled rejection]', e.reason)
  })
}

initVConsole()
initGlobalErrorLog()

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  console.error('[vue error]', info, err)
}

app.use(router)
app.use(Vant)
app.mount('#app')

console.log('[boot] app mounted', {
  base: import.meta.env.BASE_URL,
  path: location.pathname,
})
