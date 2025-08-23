import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.js'
import { initI18n } from '@/i18n/index.js'
import { useSettingsStore } from '@/stores/settings.js'
import { createLoadingPlugin } from '@/plugins/loadingPlugin.js'

const pinia = createPinia()
pinia.use(createLoadingPlugin())
const app = createApp(App)

;(async () => {
  app.use(pinia)
  
  await useSettingsStore(pinia).initTheme()
  await initI18n()
  const auth = useAuthStore(pinia)
  await auth.initSessionListener()
  
  app.use(router)
  app.mount('#fin-control')
})()
