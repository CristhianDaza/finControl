import { ref } from 'vue'
import DashboardIcon from '@/assets/icons/dashboard.svg?raw'
import TransactionsIcon from '@/assets/icons/transactions.svg?raw'
import DebtsIcon from '@/assets/icons/debts.svg?raw'
import AccountsIcon from '@/assets/icons/accounts.svg?raw'
import CategoriesIcon from '@/assets/icons/categories.svg?raw'

export const useRoutes = () => {
  const routes = ref([
    {
      id: 1,
      name: 'Dashboard',
      icon: DashboardIcon,
      url: 'home'
    },
    {
      id: 2,
      name: 'Transacciones',
      icon: TransactionsIcon,
      url: 'transactions'
    },
    {
      id: 3,
      name: 'Deudas',
      icon: DebtsIcon,
      url: 'debts'
    },
    {
      id: 4,
      name: 'Cuentas',
      icon: AccountsIcon,
      url: 'accounts'
    },
    {
      id: 5,
      name: 'Categorías',
      icon: CategoriesIcon,
      url: 'categories'
    }
  ])
  
  return {
    routes
  }
}

