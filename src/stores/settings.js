import { defineStore } from 'pinia'

const STORAGE_KEY = 'fincontrol.themeVars'

export const EDITABLE_VARS = [
  { key: '--primary-color', label: 'Color principal' },
  { key: '--secondary-color', label: 'Color secundario' },
  { key: '--background-color', label: 'Fondo principal' },
  { key: '--text-color', label: 'Texto principal' },
  { key: '--accent-color', label: 'Color de acento' },

  { key: '--tx-expense-color', label: 'Gasto' },
  { key: '--tx-goal-color', label: 'Agregar a la meta' },
  { key: '--tx-debtPayment-color', label: 'Pago de deuda' },
  { key: '--tx-income-color', label: 'Ingreso' },
  { key: '--tx-transfer-color', label: 'Transferencia' },
]

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    themeVars: /** @type {Record<string,string>} */ ({}),
    initialDefaults: /** @type {Record<string,string>} */ ({}),
    loaded: false,
  }),
  actions: {
    _readCssVar(key) {
      const val = getComputedStyle(document.documentElement).getPropertyValue(key)
      return (val || '').trim()
    },
    _applyVar(key, val) {
      document.documentElement.style.setProperty(key, val)
    },
    _applyAll(vars) {
      Object.entries(vars).forEach(([k, v]) => this._applyVar(k, v))
    },
    initTheme() {
      if (this.loaded) return

      const defaults = {}
      for (const { key } of EDITABLE_VARS) {
        defaults[key] = this._readCssVar(key)
      }
      this.initialDefaults = defaults
      let saved = {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) saved = JSON.parse(raw)
      } catch {}

      this.themeVars = { ...defaults, ...saved }
      this._applyAll(this.themeVars)
      this.loaded = true
    },
    setVar(key, value) {
      this.themeVars[key] = value
      this._applyVar(key, value)
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.themeVars))
    },
    reset() {
      this.themeVars = { ...this.initialDefaults }
      this._applyAll(this.themeVars)
      this.save()
    },
  },
})

