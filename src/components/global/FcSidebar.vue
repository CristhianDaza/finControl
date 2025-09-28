<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import { useRoutes } from '@/composables/useRoutes.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'
import { t } from '@/i18n/index.js'

import HamburgerIcon from '@/assets/icons/hamburger.svg?raw'
import LogoutIcon from '@/assets/icons/logout.svg?raw'

const LanguageSwitcher = defineAsyncComponent(/* webpackChunkName: "languageSwitcher" */ () => import('@/components/global/LanguageSwitcher.vue'))

const { routes } = useRoutes()
const { isMobile } = useIsMobile()
const isMenuHidden = ref(true)

const auth = useAuthStore()
const router = useRouter()
const isAuthenticated = computed(() => auth.isAuthenticated)

const handleMainClick = () => {
  if (!isMenuHidden.value) {
    isMenuHidden.value = true
  }
}

const clickHandler = () => {
  isMenuHidden.value = !isMenuHidden.value
}

const handleLogout = async () => {
  if (!isAuthenticated.value) return
  await auth.logout()
  await router.push({ name: 'login' })
}

const appVersion = import.meta.env.VITE_VERSION || '0.0.0'

onMounted(() => {
  isMenuHidden.value = !!isMobile.value
})

defineExpose({ handleMainClick })
</script>

<template>
  <aside class="sidebar" :class="{ 'hidden-menu': isMenuHidden }">
    <div>
      <div class="sidebar-header">
        <h2>{{ t('layout.brand') }}</h2>
        <div class="header-actions">
          <svg
            class="sidebar-icon"
            v-html="HamburgerIcon"
            @click="clickHandler"
          ></svg>
        </div>
      </div>
      <nav>
        <RouterLink
          v-for="link in routes"
          :key="link.id"
          :to="{ name: link.url }"
          exact-active-class="active"
          @click.native="isMobile ? isMenuHidden = true : null"
        >
          <span>{{ link.name }}</span>
          <svg class="icon-menu" v-html="link.icon"></svg>
        </RouterLink>
      </nav>
    </div>
    <div class="bottom-area">
      <button
        v-if="isAuthenticated"
        class="button button-delete"
        @click="handleLogout"
      >
        <span>{{ t('auth.logout') }}</span>
        <svg class="icon-menu" v-html="LogoutIcon"></svg>
      </button>
      <div class="bottom-bar" :class="{ 'lang-collapsed': isMenuHidden }">
        <div v-if="isAuthenticated" class="version-container">
          <span class="version-pill">{{ appVersion }}</span>
        </div>
        <LanguageSwitcher :collapsed="isMenuHidden" />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  min-width: 220px;
  background-color: var(--primary-color);
  padding: 2rem 1rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--secondary-color);
  max-height: 100dvh;
  transition: all 0.3s ease;
  overflow: hidden;
  box-shadow: 0 4px 10px var(--shadow-soft);
  justify-content: space-between;
}

.sidebar h2 {
  color: var(--accent-color);
  font-size: 1.4rem;
  margin: 0;
}

.sidebar-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-icon {
  cursor: pointer;
  color: var(--text-color);
  width: 24px;
  height: 24px;
}

.sidebar-icon:hover {
  color: var(--accent-color);
}

.icon-menu {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  transition: color 0.3s ease;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: width 0.3s ease;
}

a, .button {
  color: var(--text-color);
  text-decoration: none;
  font-weight: 500;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

a:hover {
  background-color: var(--secondary-color);
  color: var(--accent-color);
}

a:hover .icon-menu {
  color: var(--accent-color);
}

.active {
  background-color: var(--accent-color);
  color: var(--background-color);
}

.hidden-menu {
  min-width: 3rem;
  max-width: 3rem;
}

.hidden-menu nav {
  margin-top: 6px;
}

.hidden-menu.sidebar {
  padding: 1.2rem 0.25rem;
}

.hidden-menu .sidebar-header h2 {
  display: none;
}

.hidden-menu .sidebar-header {
  justify-content: center;
}

.hidden-menu span {
  display: none;
}

.hidden-menu a {
  justify-content: center;
  width: 1rem;
}

.hidden-menu button {
  justify-content: center;
}

.hidden-menu .icon-menu {
  width: 20px;
  height: 20px;
}

.bottom-area { display:flex; flex-direction: column; gap:.5rem }
.bottom-bar {
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding-top: 1rem;
}

.lang-collapsed {
  justify-content: center;
}

.version-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.version-label {
  font-size: 0.75rem;
  color: var(--text-color);
  opacity: 0.8;
}

.version-pill {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--secondary-color);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--text-color);
  background-color: transparent;
}
</style>
