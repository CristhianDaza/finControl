<script setup>
import { ref, onMounted } from 'vue'
import { useRoutes } from '@/composables/useRoutes.js'
import { useIsMobile } from '@/composables/useIsMobile.js'

import HamburgerIcon from '@/assets/icons/hamburger.svg?raw'
import LoginIcon from '@/assets/icons/login.svg?raw'
import LogoutIcon from '@/assets/icons/logout.svg?raw'

const { routes } = useRoutes()
const { isMobile } = useIsMobile()
const isMenuHidden = ref(true)

const emit = defineEmits(['login', 'logout'])

const handleMainClick = () => {
  if (!isMenuHidden.value) {
    isMenuHidden.value = true
  }
}

const clickHandler = () => {
  isMenuHidden.value = !isMenuHidden.value
}

const handleClickSession = (event) => {
  if (event === 'login') {
    emit('login')
  } else {
    emit('logout')
  }
}

onMounted(() => {
  if (isMobile.value) {
    isMenuHidden.value = true
    return
  }
  isMenuHidden.value = false
})

defineExpose({
  handleMainClick,
})
</script>

<template>
  <aside class="sidebar" :class="{ 'hidden-menu': isMenuHidden }">
    <div>
      <div class="sidebar-header">
        <h2>FinControl</h2>
        <svg class="sidebar-icon" v-html="HamburgerIcon" @click="clickHandler"></svg>
      </div>
      <nav>
        <RouterLink
          v-for="link in routes"
          :key="link.id"
          :to="{ name: link.url }"
          exact-active-class="active"
          @click.native="isMobile ? isMenuHidden = true : null"
        >
          <span>{{ link.name}}</span><svg class="icon-menu" v-html="link.icon"></svg>
        </RouterLink>
      </nav>
    </div>
    <button
      class="button button-secondary"
      v-if="!isMenuHidden"
      @click="handleClickSession('login')"
    >
      <span>Iniciar sesión</span><svg class="icon-menu" v-html="LoginIcon"></svg>
    </button>
    <button
      class="button button-delete"
      v-else
      @click="handleClickSession('logout')"
    >
      <span>Cerrar sesión</span><svg class="icon-menu" v-html="LogoutIcon"></svg>
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  min-width: 220px;
  background-color: var(--primary-color);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--secondary-color);
  max-height: 100dvh;
  transition: all 0.3s ease;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
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
</style>
