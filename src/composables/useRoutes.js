import { ref, computed } from 'vue'
import { t } from '@/i18n/index.js'
import DashboardIcon from '@/assets/icons/dashboard.svg?raw'
import TransactionsIcon from '@/assets/icons/transactions.svg?raw'
import RecurringIcon from '@/assets/icons/recurring.svg?raw'
import DebtsIcon from '@/assets/icons/debts.svg?raw'
import AccountsIcon from '@/assets/icons/accounts.svg?raw'
import GoalsIcon from '@/assets/icons/goals.svg?raw'
import SettingsIcon from '@/assets/icons/settings.svg?raw'
import BudgetsIcon from '@/assets/icons/budgets.svg?raw'
import { useAuthStore } from '@/stores/auth.js'

export const useRoutes = () => {
  const auth = useAuthStore()
  const base = ref([
    {
      id: 1,
      key: 'navigation.dashboard',
      icon: DashboardIcon,
      url: 'home'
    },
    {
      id: 2,
      key: 'navigation.transactions',
      icon: TransactionsIcon,
      url: 'transactions'
    },
    {
      id: 4,
      key: 'navigation.accounts',
      icon: AccountsIcon,
      url: 'accounts'
    },
    {
      id: 3,
      key: 'navigation.debts',
      icon: DebtsIcon,
      url: 'debts'
    },
    {
      id: 6,
      key: 'navigation.recurring',
      icon: RecurringIcon,
      url: 'recurring'
    },
    {
      id: 7,
      key: 'navigation.goals',
      icon: GoalsIcon,
      url: 'goals'
    },
    {
      id: 5,
      key: 'navigation.budgets',
      icon: BudgetsIcon,
      url: 'budgets'
    },
    {
      id: 8,
      key: 'navigation.settings',
      icon: SettingsIcon,
      url: 'settings'
    }
  ])
  const routes = computed(() => {
    const list = [...base.value]
    if (auth.isAdmin)
      list.push({
        id: 100,
        key: 'navigation.admin',
        icon: SettingsIcon,
        url: 'admin'
      })
    return list.map(route => ({
      ...route,
      name: t(route.key)
    }))
  })
  return { routes }
}
