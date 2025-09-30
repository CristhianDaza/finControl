<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoutes } from '@/composables/useRoutes.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'
import { t } from '@/i18n/index.js'

import HamburgerIcon from '@/assets/icons/hamburger.svg?raw'
import LogoutIcon from '@/assets/icons/logout.svg?raw'

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
        class="logout-button"
        @click="handleLogout"
      >
        <span>{{ t('auth.logout') }}</span>
        <svg class="icon-menu" v-html="LogoutIcon"></svg>
      </button>
      <div class="bottom-bar">
        <div v-if="isAuthenticated" class="version-container">
          <span class="version-pill">{{ appVersion }}</span>
        </div>
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
  transition: all 0.3s ease;
  padding: 0.25rem;
  border-radius: 4px;
}

.sidebar-icon:hover {
  color: var(--accent-color);
  background-color: rgba(var(--accent-color-rgb, 0, 123, 255), 0.1);
  transform: rotate(90deg);
}

.icon-menu {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: width 0.3s ease;
}

a, .button {
  color: var(--text-color);
  text-decoration: none;
  font-weight: 500;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.02));
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

a::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  transition: left 0.5s ease;
}

a:hover {
  background: linear-gradient(135deg, var(--secondary-color), rgba(var(--accent-color-rgb, 0, 123, 255), 0.1));
  color: var(--accent-color);
  border-color: rgba(var(--secondary-color 0, 123, 255), 0.2);
  transform: translateX(4px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

a:hover::before {
  left: 100%;
}

a:hover .icon-menu {
  color: var(--accent-color);
  transform: scale(1.1);
}

.active {
  background-color: var(--accent-color);
  color: var(--white, #ffffff);
  border-color: var(--accent-color);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color, rgb(0, 123, 255)) 60%, transparent);
  transform: translateX(2px);
}

.active .icon-menu {
  color: var(--white, #ffffff);
}

.active:hover {
  transform: translateX(6px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color, rgb(0, 123, 255)) 60%, transparent);
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
  width: 100%;
  padding: 0.75rem;
  transform: none;
  min-width: 44px;
  min-height: 44px;
}

.hidden-menu a:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hidden-menu .active {
  transform: scale(1.02);
}

.hidden-menu .active:hover {
  transform: scale(1.08);
}

.hidden-menu .icon-menu {
  width: 22px;
  height: 22px;
}

.bottom-area { display:flex; flex-direction: column; gap:.5rem }
.bottom-bar {
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding-top: 1rem;
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

.logout-button {
  background: linear-gradient(135deg, transparent, var(--secondary-color));
  color: var(--text-color);
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.logout-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.logout-button:hover {
  background: linear-gradient(135deg, var(--secondary-color), var(--accent-color));
  color: var(--white, #ffffff);
  border-color: var(--accent-color);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.logout-button:hover::before {
  left: 100%;
}

.logout-button:hover .icon-menu {
  color: var(--white, #ffffff);
  transform: rotate(10deg) scale(1.1);
}

.logout-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logout-button .icon-menu {
  width: 18px;
  height: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hidden-menu .logout-button {
  padding: 0.75rem;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
}

.hidden-menu .logout-button span {
  display: none;
}

.hidden-menu .logout-button .icon-menu {
  width: 20px;
  height: 20px;
}

a:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
</style>
