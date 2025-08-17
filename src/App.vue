<script setup>
import { defineAsyncComponent, ref, watch, onMounted } from 'vue'
import { useIsMobile} from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { useSettingsStore } from '@/stores/settings.js'

const FcSidebar = defineAsyncComponent(/* webpackChunkName: "FcSidebar" */ () => import('@/components/global/FcSidebar.vue'))
const FCNotify = defineAsyncComponent(/* webpackChunkName: "FCNotify" */ () => import('@/components/global/FCNotify.vue'))

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const sidebarRef = ref()
const recurring = useRecurringStore()
const settings = useSettingsStore()

const clickMainContent = () => {
  if (isMobile.value) {
    sidebarRef.value?.handleMainClick?.();
  }
}

onMounted(async () => {
  // Inicializar tema al inicio
  try { await settings.initTheme() } catch {}

  if (auth.isAuthenticated) {
    try { await recurring.processDue() } catch {}
  }
})

watch(() => auth.isAuthenticated, async (v) => {
  if (v) {
    // cargar tema remoto al autenticar
    try { settings.loaded = false; await settings.initTheme() } catch {}
    try { await recurring.processDue() } catch {}
  } else {
    // al cerrar sesión el store de settings ya limpia la caché; aseguramos aplicar defaults
    try { settings.clearCacheOnLogout() } catch {}
  }
})
</script>

<template>
  <div class="layout">
    <fc-sidebar v-if="auth.isAuthenticated" ref="sidebarRef" />
    <main class="main-content" @click="clickMainContent">
      <router-view v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
  <FCNotify />
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
