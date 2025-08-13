import { ref, computed } from 'vue'
import { t } from '@/i18n/index.js'
import DashboardIcon from '@/assets/icons/dashboard.svg?raw'
import TransactionsIcon from '@/assets/icons/transactions.svg?raw'
import DebtsIcon from '@/assets/icons/debts.svg?raw'
import AccountsIcon from '@/assets/icons/accounts.svg?raw'
import CategoriesIcon from '@/assets/icons/categories.svg?raw'

export const useRoutes = () => {
  const base = ref([
    { id: 1, key: 'navigation.dashboard', icon: DashboardIcon, url: 'home' },
    { id: 2, key: 'navigation.transactions', icon: TransactionsIcon, url: 'transactions' },
    { id: 3, key: 'navigation.debts', icon: DebtsIcon, url: 'debts' },
    { id: 4, key: 'navigation.accounts', icon: AccountsIcon, url: 'accounts' },
    // { id: 5, key: 'navigation.categories', icon: CategoriesIcon, url: 'categories' },
  ])

  const routes = computed(() => base.value.map(r => ({ ...r, name: t(r.key) })))
  return { routes }
}
