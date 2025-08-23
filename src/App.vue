<script setup>
import { defineAsyncComponent, ref, watch, onMounted, computed } from 'vue'
import { useIsMobile} from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useRoute } from 'vue-router'

const FcSidebar = defineAsyncComponent(/* webpackChunkName: "FcSidebar" */ () => import('@/components/global/FcSidebar.vue'))
const FCNotify = defineAsyncComponent(/* webpackChunkName: "FCNotify" */ () => import('@/components/global/FCNotify.vue'))
const FCGlobalLoader = defineAsyncComponent(() => import('@/components/global/FCGlobalLoader.vue'))

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const sidebarRef = ref()
const recurring = useRecurringStore()
const settings = useSettingsStore()
const route = useRoute()
const isLoginRoute = computed(() => route.name === 'login')

const clickMainContent = () => {
  if (isMobile.value) {
    sidebarRef.value?.handleMainClick?.();
  }
}

let visibilityHandlerAttached = false
let debounceTimer = null
const DEBOUNCE_MS = 400
const triggerRecurring = () => {
  if (!auth.isAuthenticated) return
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { recurring.processDue() }, DEBOUNCE_MS)
}

onMounted(async () => {
  try { await settings.initTheme() } catch {}
  if (auth.isAuthenticated) triggerRecurring()
  if (!visibilityHandlerAttached) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') triggerRecurring() })
    visibilityHandlerAttached = true
  }
})

watch(() => auth.isAuthenticated, async (v) => {
  if (v) {
    try { settings.loaded = false; await settings.initTheme() } catch {}
    triggerRecurring()
  } else {
    try { settings.clearCacheOnLogout() } catch {}
  }
})
</script>

<template>
  <div class="layout" :class="{ 'is-login': isLoginRoute }">
    <fc-sidebar v-if="auth.isAuthenticated" ref="sidebarRef" />
    <main class="main-content" :class="{ 'login-page': isLoginRoute }" @click="clickMainContent">
      <router-view v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
  <FCNotify />
  <FCGlobalLoader />
</template>

<style scoped>
.layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: clamp(1rem, 4vw, 2rem);
}

.main-content.login-page {
  display: grid;
  place-items: center;
  padding: 0;
  overflow: hidden;
}

.route-fade-enter-active,
.route-fade-leave-active {
  transition: all 0.3s ease;
}

.route-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.route-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.route-fade-enter-from,
.route-fade-leave-to {
  filter: blur(4px);
  opacity: 0;
}
</style>
