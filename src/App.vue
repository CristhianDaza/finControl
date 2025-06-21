<script setup>
import { defineAsyncComponent, ref } from 'vue'
import { useIsMobile} from '@/composables/useIsMobile.js'

const FcSidebar = defineAsyncComponent(/* webpackChunkName: "FcSidebar" */ () => import('@/components/global/FcSidebar.vue'))

const { isMobile } = useIsMobile()
const sidebarRef = ref()

const clickMainContent = () => {
  if (isMobile.value) {
    sidebarRef.value?.handleMainClick?.();
  }
}
</script>

<template>
  <div class="layout">
    <fc-sidebar ref="sidebarRef" />
    <main class="main-content" @click="clickMainContent">
      <router-view v-slot="{ Component }">
        <transition name="route-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
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
