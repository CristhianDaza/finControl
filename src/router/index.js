import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import(/* webpackChunkName: "loginView" */  '@/views/LoginView.vue') },
    {
      path: '/admin',
      name: 'admin',
      component: () => import(/* webpackChunkName: "adminDashboard" */  '@/views/AdminDashboard.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import(/* webpackChunkName: "homeView" */  '@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import(/* webpackChunkName: "transactionsView" */  '@/views/TransactionsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/debts',
      name: 'debts',
      component: () => import(/* webpackChunkName: "debtsView" */  '@/views/DebtsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import(/* webpackChunkName: "accountsView" */  '@/views/AccountsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/recurring',
      name: 'recurring',
      component: () => import(/* webpackChunkName: "recurringView" */  '@/views/RecurringView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import(/* webpackChunkName: "goalsView" */  '@/views/GoalsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import(/* webpackChunkName: "budgetsView" */ '@/views/BudgetsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import(/* webpackChunkName: "settingsView" */ '@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  await auth.initSessionListener()

  if (to.meta?.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta?.requiresAdmin && !auth.isAdmin) {
    next({ name: 'home' })
  } else if (to.name === 'login' && auth.isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
