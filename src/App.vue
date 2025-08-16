<script setup>
import { defineAsyncComponent, ref, watch, onMounted } from 'vue'
import { useIsMobile} from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRecurringStore } from '@/stores/recurring.js'

const FcSidebar = defineAsyncComponent(/* webpackChunkName: "FcSidebar" */ () => import('@/components/global/FcSidebar.vue'))
const FCNotify = defineAsyncComponent(/* webpackChunkName: "FCNotify" */ () => import('@/components/global/FCNotify.vue'))

const { isMobile } = useIsMobile()
const auth = useAuthStore()
const sidebarRef = ref()
const recurring = useRecurringStore()

const clickMainContent = () => {
  if (isMobile.value) {
    sidebarRef.value?.handleMainClick?.();
  }
}

onMounted(async () => {
  if (auth.isAuthenticated) {
    try { await recurring.processDue() } catch {}
  }
})

watch(() => auth.isAuthenticated, async (v) => {
  if (v) {
    try { await recurring.processDue() } catch {}
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
    <router-link v-if="auth.isAuthenticated" to="/settings" class="settings-fab" title="Configuración">⚙</router-link>
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

.settings-fab {
  position: fixed;
  right: clamp(12px, 2vw, 20px);
  bottom: clamp(12px, 2vw, 20px);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: var(--secondary-color);
  color: var(--accent-color);
  border: 1px solid var(--primary-color);
  box-shadow: 0 2px 8px var(--shadow-elev-2);
  font-size: 20px;
}
.settings-fab:hover { background: var(--hover-secondary-color); }
</style>
