import { formatNumber, formatCurrency, formatDate } from '@/i18n/index.js'

export { formatNumber, formatCurrency, formatDate }

export const formatDateISO = (iso, options) => {
  try { return formatDate(iso, options) } catch { return '' }
}

