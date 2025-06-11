<script setup>
import { ref } from 'vue'
import DashboardIcon from '@/assets/icons/dashboard.svg?raw'
import HamburgerIcon from '@/assets/icons/hamburger.svg?raw'

const isMenuHidden = ref(true)

const clickHandler = () => {
  console.log('Hamburger icon clicked')
  isMenuHidden.value = !isMenuHidden.value
}
</script>

<template>
  <aside class="sidebar" :class="{ 'hidden-menu': isMenuHidden }">
    <div class="sidebar-header">
      <h2>FinControl</h2>
      <svg class="sidebar-icon" v-html="HamburgerIcon" @click="clickHandler"></svg>
    </div>
    <nav>
      <RouterLink to="/" exact-active-class="active">
        <span>Dashboard</span><svg class="icon-menu" v-html="DashboardIcon"></svg>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background-color: var(--primary-color);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--secondary-color);
  max-height: 100dvh;
  transition: all 0.3s ease;
  overflow: hidden;
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
  padding-bottom: .8rem;
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

a {
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
  width: 3rem;
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

.hidden-menu .icon-menu {
  width: 20px;
  height: 20px;
}
</style>
