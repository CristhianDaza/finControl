import { ref, computed } from 'vue'

const LOCALE_KEY = 'app.lang'
const supported = ['es', 'en']
const loaded = new Set()

const localeRef = ref('es')

export const intlLocale = computed(() => localeRef.value === 'en' ? 'en-US' : 'es-CO')

const messages = { es: {}, en: {} }

const deepGet = (obj, path) => {
  const parts = path.split('.')
  let cur = obj
  for (const p of parts) { if (cur == null) return undefined; cur = cur[p] }
  return cur
}

const template = (str, params) =>
  str.replace(/\{(\w+)\}/g, (_, k) => params?.[k] ?? '')

export const getLocale = () => localeRef.value

export const setLocale = async (locale) => {
  const next = supported.includes(locale) ? locale : 'es'
  if (!loaded.has(next)) {
    if (next === 'es') {
      messages.es = (await import('./locales/es.json')).default
    } else if (next === 'en') {
      messages.en = (await import('./locales/en.json')).default
    }
    loaded.add(next)
  }
  localeRef.value = next
  try { localStorage.setItem(LOCALE_KEY, next) } catch {}
  if (typeof document !== 'undefined') { document.documentElement.lang = next }
}

const initial = (() => {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (supported.includes(saved)) return saved
  } catch {}
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'es').toLowerCase()
  return nav.startsWith('en') ? 'en' : 'es'
})()

export const initI18n = async () => {
  await setLocale(initial)
}

export const t = (path, params) => {
  const loc = localeRef.value
  const primary = deepGet(messages[loc], path)
  const alt = deepGet(messages[loc === 'es' ? 'en' : 'es'], path)
  if (primary == null && alt == null) return path
  const val = primary ?? alt
  if (typeof val === 'string') return params ? template(val, params) : val
  return val
}

export const tp = (path, count, params = {}) => {
  const v = t(path)
  if (v && typeof v === 'object') {
    const form = count === 1 ? v.one : v.other
    return template(form, { ...params, count })
  }

  if (typeof v === 'string') return template(v, { ...params, count })
  return String(count)
}

const nfCache = new Map()
const dfCache = new Map()
const cfCache = new Map()

const nfKey = (opts) => JSON.stringify(opts)

export const formatNumber = (value, options = {}) => {
  const loc = intlLocale.value
  const key = loc + '|' + nfKey(options)
  let fmt = nfCache.get(key)
  if (!fmt) { fmt = new Intl.NumberFormat(loc, options); nfCache.set(key, fmt) }
  const n = Number(value)
  return isNaN(n) ? '' : fmt.format(n)
}

export const formatPercent = (value, options = { style: 'percent', maximumFractionDigits: 2 }) =>
  formatNumber(value, options)

export const formatCurrency = (value, currency = 'COP', options = {}) => {
  const loc = intlLocale.value
  const key = loc + '|' + currency + '|' + nfKey(options)
  let fmt = cfCache.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(loc, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2, ...options })
    cfCache.set(key, fmt)
  }
  const n = Number(value)
  return isNaN(n) ? '' : fmt.format(n)
}

export const formatCurrencyCompact = (value, currency = 'COP', options = {}) => {
  const n = Number(value)
  if (isNaN(n)) return ''
  const loc = intlLocale.value
  const abs = Math.abs(n)
  let div = 1
  let suffix = ''
  if (abs >= 1_000_000_000) { div = 1_000_000_000; suffix = 'B' }
  else if (abs >= 1_000_000) { div = 1_000_000; suffix = 'M' }
  else if (abs >= 1_000) { div = 1_000; suffix = 'K' }
  const reduced = abs / div
  let symbol = ''
  try {
    const parts = new Intl.NumberFormat(loc, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0, ...options }).formatToParts(0)
    symbol = parts.find(p => p.type === 'currency')?.value || ''
  } catch {}
  const numStr = new Intl.NumberFormat(loc, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(reduced)
  if (!suffix) return formatCurrency(n, currency, options)
  const sign = n < 0 ? '-' : ''
  return sign + symbol + numStr + suffix
}

export const formatDate = (date, options = { dateStyle: 'medium', timeZone: 'America/Bogota' }) => {
  const loc = intlLocale.value
  const key = loc + '|' + nfKey(options)
  let fmt = dfCache.get(key)
  if (!fmt) { fmt = new Intl.DateTimeFormat(loc, options); dfCache.set(key, fmt) }
  try {
    let d = date
    if (typeof date === 'object' && date?.seconds) d = new Date(date.seconds * 1000)
    if (typeof date === 'number') d = new Date(date)
    if (typeof date === 'string') return date
    return fmt.format(d)
  } catch { return '' }
}

export { localeRef }
