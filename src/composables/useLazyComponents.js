import { defineAsyncComponent, h } from 'vue'

const LoadingComponent = {
  render() {
    return h('div', { class: 'lazy-loading' }, [
      h('div', { class: 'spinner' })
    ])
  }
}

const ErrorComponent = {
  emits: ['retry'],
  render() {
    return h('div', { class: 'lazy-error' }, [
      h('p', 'Error loading component'),
      h('button', {
        onClick: () => this.$emit('retry')
      }, 'Retry')
    ])
  }
}

const createAsyncComponent = (loader) => {
  return defineAsyncComponent({
    loader,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    delay: 200,
    timeout: 10000,
    suspensible: false
  })
}

export const useLazyComponents = () => {
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

  const preloadComponent = (componentLoader) => {
    return componentLoader()
  }

  const preloadModals = () => {
    preloadComponent(() => import('@/components/transactions/TransactionsModalComponent.vue'))
    preloadComponent(() => import('@/components/accounts/AccountsModalComponent.vue'))
  }

  return {
    TransactionsModal,
    AccountsModal,
    CategoriesModal,
    DebtsModal,
    TransferModal,
    AuthModal,
    ConfirmModal,
    Sidebar,
    Notify,
    GlobalLoader,
    preloadComponent,
    preloadModals,
    createAsyncComponent
  }
}
