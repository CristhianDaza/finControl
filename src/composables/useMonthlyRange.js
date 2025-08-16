import { computed } from 'vue'
import { intlLocale } from '@/i18n/index.js'

const BOGOTA_OFFSET_HOURS = -5

const toBogotaMonthIndex = (date = new Date()) => {
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60_000
  const bogotaTime = new Date(utcTime + BOGOTA_OFFSET_HOURS * 3_600_000)
  return bogotaTime.getUTCMonth()
}

const toBogotaYear = (date = new Date()) => {
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60_000
  const bogotaTime = new Date(utcTime + BOGOTA_OFFSET_HOURS * 3_600_000)
  return bogotaTime.getUTCFullYear()
}

const monthLabels = (locale = 'es-CO') => {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'America/Bogota' })
  const labels = []
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2020, m, 1, 5, 0, 0))
    let lab = fmt.format(d)
    lab = lab.replace('.', '')
    lab = lab.charAt(0).toUpperCase() + lab.slice(1)
    labels.push(lab)
  }
  return labels
}

const monthRange = (year, monthIndex) => {
  const start = new Date(Date.UTC(year, monthIndex, 1, 5, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 5, 0, 0, 0) - 1)
  return { start, end }
}

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate()

export const useMonthlyRange = () => {
  const currentMonthIndex = toBogotaMonthIndex()
  const currentYear = toBogotaYear()
  const labels = computed(() => monthLabels(intlLocale.value))
  return { currentMonthIndex, currentYear, labels, monthRange, daysInMonth }
}
