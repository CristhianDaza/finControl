import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth.js'
import { initI18n } from '@/i18n/index.js'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)

await initI18n()

const auth = useAuthStore()
await auth.initSessionListener()

app.use(router)
app.mount('#fin-control')
