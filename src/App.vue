<script setup>
import { ref, watch, onMounted, computed, defineAsyncComponent } from 'vue'
import { useIsMobile} from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useInactivityLock } from '@/composables/useInactivityLock.js'
import { useRoute } from 'vue-router'
import { t } from '@/i18n/index.js'
import { useLazyComponents } from '@/composables/useLazyComponents.js'

const FCStatusBar = defineAsyncComponent(/* webpackChunkName: "fCStatusBar" */ () => import('@/components/FCStatusBar.vue'))
const FCGlobalLoader = defineAsyncComponent(/* webpackChunkName: "fCGlobalLoader" */ () => import('@/components/global/FCGlobalLoader.vue'))
const InactivityLockModal = defineAsyncComponent(/* webpackChunkName: "inactivityLockModal" */ () => import('@/components/global/InactivityLockModal.vue'))

const { Sidebar, Notify, preloadModals } = useLazyComponents()

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const sidebarRef = ref()
const recurring = useRecurringStore()
const settings = useSettingsStore()
const route = useRoute()
const isLoginRoute = computed(() => route.name === 'login')

const { startTracking, stopTracking } = useInactivityLock()

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
  if (auth.isAuthenticated) {
    triggerRecurring()
    setTimeout(() => preloadModals(), 2000)
  }
  if (!visibilityHandlerAttached) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') triggerRecurring() })
    visibilityHandlerAttached = true
  }
})

watch(() => auth.isAuthenticated, async (v) => {
  if (v) {
    try { settings.loaded = false; await settings.initTheme() } catch {}
    triggerRecurring()
    setTimeout(() => preloadModals(), 2000)
    startTracking()
  } else {
    try { settings.clearCacheOnLogout() } catch {}
    stopTracking()
  }
}, { immediate: true })

const statusMessage = computed(() => auth.isReadOnly ? t('access.inactiveNotice') : '')
</script>

<template>
  <FCStatusBar :open="auth.isReadOnly" type="warning" :message="statusMessage" :action-text="t('access.activateNow')" action-href="/settings" />
  <div class="layout" :class="{ 'is-login': isLoginRoute }">
    <Sidebar v-if="auth.isAuthenticated" ref="sidebarRef" />
    <main class="main-content" :class="{ 'login-page': isLoginRoute, 'has-bar': auth.isReadOnly }" @click="clickMainContent">
      <router-view v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
  <Notify />
  <FCGlobalLoader />
  <InactivityLockModal />
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

.main-content.has-bar {
  padding-top: calc(clamp(1rem,4vw,2rem) + 48px);
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
