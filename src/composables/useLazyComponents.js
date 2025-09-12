import { defineAsyncComponent } from 'vue'

// Loading component for better UX
const LoadingComponent = {
  template: `
    <div class="lazy-loading">
      <div class="spinner"></div>
    </div>
  `
}

// Error component for failed loads
const ErrorComponent = {
  template: `
    <div class="lazy-error">
      <p>Error loading component</p>
      <button @click="$emit('retry')">Retry</button>
    </div>
  `
}

// Create async component with optimized loading
const createAsyncComponent = (loader, chunkName) => {
  return defineAsyncComponent({
    loader,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    delay: 200, // Show loading after 200ms
    timeout: 10000, // Timeout after 10s
    suspensible: false
  })
}

export const useLazyComponents = () => {
  // Modal components (heavy, rarely used initially)
  const TransactionsModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-transactions" */ '@/components/transactions/TransactionsModalComponent.vue'),
    'modals-transactions'
  )

  const AccountsModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-accounts" */ '@/components/accounts/AccountsModalComponent.vue'),
    'modals-accounts'
  )

  const CategoriesModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-categories" */ '@/components/categories/CategoriesModalComponent.vue'),
    'modals-categories'
  )

  const DebtsModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-debts" */ '@/components/debts/DebtsModalComponent.vue'),
    'modals-debts'
  )

  const TransferModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-transfer" */ '@/components/FCTransferModal.vue'),
    'modals-transfer'
  )

  const AuthModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-auth" */ '@/components/global/FcAuthModal.vue'),
    'modals-auth'
  )

  const ConfirmModal = createAsyncComponent(
    () => import(/* webpackChunkName: "modals-confirm" */ '@/components/global/FCConfirmModal.vue'),
    'modals-confirm'
  )

  // Global components (used frequently, but can be lazy)
  const Sidebar = createAsyncComponent(
    () => import(/* webpackChunkName: "global-sidebar" */ '@/components/global/FcSidebar.vue'),
    'global-sidebar'
  )

  const Notify = createAsyncComponent(
    () => import(/* webpackChunkName: "global-notify" */ '@/components/global/FCNotify.vue'),
    'global-notify'
  )

  const GlobalLoader = createAsyncComponent(
    () => import(/* webpackChunkName: "global-loader" */ '@/components/global/FCGlobalLoader.vue'),
    'global-loader'
  )

  // Utility function to preload components
  const preloadComponent = (componentLoader) => {
    return componentLoader()
  }

  // Preload critical components on user interaction
  const preloadModals = () => {
    // Preload modals when user hovers over action buttons
    preloadComponent(() => import('@/components/transactions/TransactionsModalComponent.vue'))
    preloadComponent(() => import('@/components/accounts/AccountsModalComponent.vue'))
  }

  return {
    // Modal components
    TransactionsModal,
    AccountsModal,
    CategoriesModal,
    DebtsModal,
    TransferModal,
    AuthModal,
    ConfirmModal,
    
    // Global components
    Sidebar,
    Notify,
    GlobalLoader,
    
    // Utilities
    preloadComponent,
    preloadModals,
    createAsyncComponent
  }
}
