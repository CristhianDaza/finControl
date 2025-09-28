import { formatNumber, formatCurrency, formatDate, formatCurrencyCompact } from '@/i18n/index.js'
import { useSettingsStore } from '@/stores/settings.js'

export { formatNumber, formatCurrency, formatDate }

export const formatAmount = (value, currency = 'COP') => {
  const n = Number(value)
  if (isNaN(n)) return ''
  try {
    const settings = useSettingsStore()
    return settings.amountFormat === 'compact'
      ? formatCurrencyCompact(n, currency)
      : formatCurrency(n, currency)
  } catch {
    return formatCurrency(n, currency)
  }
}
