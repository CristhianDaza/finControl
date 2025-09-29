import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.js'
import { initI18n, setLocale } from '@/i18n/index.js'
import { useSettingsStore } from '@/stores/settings.js'
import { createLoadingPlugin } from '@/plugins/loadingPlugin.js'
import { migrateCurrencies } from '@/utils/migrateCurrencies.js'
import { auth } from '@/services/firebase.js'
import { useUserPrefs } from '@/composables/useUserPrefs.js'
import FcTooltip from '@/components/global/FcTooltip.vue'

const pinia = createPinia()
pinia.use(createLoadingPlugin())
const app = createApp(App)

;(async () => {
  app.use(pinia)
  app.component('FcTooltip', FcTooltip)
  
  await useSettingsStore(pinia).initTheme()
  await initI18n()
  const authStore = useAuthStore(pinia)
  await authStore.initSessionListener()

  if (auth.currentUser) {
    try {
      const { getAppPrefs } = useUserPrefs()
      const prefs = await getAppPrefs()
      if (prefs && prefs.language) await setLocale(prefs.language)
    } catch {}
  }

  if (auth.currentUser) { try { await migrateCurrencies(auth.currentUser.uid) } catch {} }
  
  app.use(router)
  app.mount('#fin-control')
})()
