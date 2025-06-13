import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import(/* webpackChunkName: "homeView" */  '@/views/HomeView.vue')
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import(/* webpackChunkName: "transactionsView" */  '@/views/TransactionsView.vue')
    },
    {
      path: '/debts',
      name: 'debts',
      component: () => import(/* webpackChunkName: "debtsView" */  '@/views/DebtsView.vue')
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import(/* webpackChunkName: "accountsView" */  '@/views/AccountsView.vue')
    }
  ]
})
