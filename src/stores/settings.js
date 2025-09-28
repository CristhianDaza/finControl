import { defineStore } from 'pinia'
import { auth } from '@/services/firebase.js'
import { useUserPrefs } from '@/composables/useUserPrefs.js'

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
  { key: '--tx-transfer-color', label: 'Transferencia' }
]

export const THEME_PRESETS = [
  {
    id: 'dark-ocean',
    mode: 'dark',
    nameKey: 'settings.theme.presets.names.darkOcean',
    vars: {
      '--primary-color': '#243447',
      '--secondary-color': '#0D1117',
      '--background-color': '#0A192F',
      '--text-color': '#E0E1E9',
      '--accent-color': '#3FA9F5',
      '--tx-expense-color': '#EF4444',
      '--tx-goal-color': '#F59E0B',
      '--tx-debtPayment-color': '#8B5CF6',
      '--tx-income-color': '#22C55E',
      '--tx-transfer-color': '#3FA9F5'
    }
  },
  {
    id: 'dark-rose',
    mode: 'dark',
    nameKey: 'settings.theme.presets.names.darkRose',
    vars: {
      '--primary-color': '#1f1f28',
      '--secondary-color': '#14141b',
      '--background-color': '#121216',
      '--text-color': '#EAEAF0',
      '--accent-color': '#FF7AB6',
      '--tx-expense-color': '#F43F5E',
      '--tx-goal-color': '#F59E0B',
      '--tx-debtPayment-color': '#C084FC',
      '--tx-income-color': '#22C55E',
      '--tx-transfer-color': '#FB7185'
    }
  },
  {
    id: 'dark-forest',
    mode: 'dark',
    nameKey: 'settings.theme.presets.names.darkForest',
    vars: {
      '--primary-color': '#1B2A24',
      '--secondary-color': '#122019',
      '--background-color': '#0D1713',
      '--text-color': '#E3EEE8',
      '--accent-color': '#4ADE80',
      '--tx-expense-color': '#F87171',
      '--tx-goal-color': '#FBBF24',
      '--tx-debtPayment-color': '#34D399',
      '--tx-income-color': '#22C55E',
      '--tx-transfer-color': '#2DD4BF'
    }
  },
  {
    id: 'light-ocean',
    mode: 'light',
    nameKey: 'settings.theme.presets.names.lightOcean',
    vars: {
      '--primary-color': '#FFFFFF',
      '--secondary-color': '#F1F5F9',
      '--background-color': '#F7FAFC',
      '--text-color': '#111827',
      '--accent-color': '#2563EB',
      '--tx-expense-color': '#DC2626',
      '--tx-goal-color': '#D97706',
      '--tx-debtPayment-color': '#7C3AED',
      '--tx-income-color': '#16A34A',
      '--tx-transfer-color': '#0284C7'
    }
  },
  {
    id: 'light-rose',
    mode: 'light',
    nameKey: 'settings.theme.presets.names.lightRose',
    vars: {
      '--primary-color': '#FFFFFF',
      '--secondary-color': '#FDF2F8',
      '--background-color': '#FFF7FB',
      '--text-color': '#1F2937',
      '--accent-color': '#DB2777',
      '--tx-expense-color': '#E11D48',
      '--tx-goal-color': '#F59E0B',
      '--tx-debtPayment-color': '#A78BFA',
      '--tx-income-color': '#16A34A',
      '--tx-transfer-color': '#EC4899'
    }
  },
  {
    id: 'light-slate',
    mode: 'light',
    nameKey: 'settings.theme.presets.names.lightSlate',
    vars: {
      '--primary-color': '#FFFFFF',
      '--secondary-color': '#F3F4F6',
      '--background-color': '#FAFAFA',
      '--text-color': '#111827',
      '--accent-color': '#0EA5E9',
      '--tx-expense-color': '#DC2626',
      '--tx-goal-color': '#D97706',
      '--tx-debtPayment-color': '#6366F1',
      '--tx-income-color': '#16A34A',
      '--tx-transfer-color': '#22D3EE'
    }
  },
  {
    id: 'dark-amber',
    mode: 'dark',
    nameKey: 'settings.theme.presets.names.darkAmber',
    vars: {
      '--primary-color': '#2A2115',
      '--secondary-color': '#1C170F',
      '--background-color': '#14100B',
      '--text-color': '#F3EEE6',
      '--accent-color': '#F59E0B',
      '--tx-expense-color': '#F87171',
      '--tx-goal-color': '#F59E0B',
      '--tx-debtPayment-color': '#A78BFA',
      '--tx-income-color': '#22C55E',
      '--tx-transfer-color': '#FBBF24'
    }
  },
  {
    id: 'dark-teal',
    mode: 'dark',
    nameKey: 'settings.theme.presets.names.darkTeal',
    vars: {
      '--primary-color': '#15222A',
      '--secondary-color': '#0F1A20',
      '--background-color': '#0B1418',
      '--text-color': '#E2EEF2',
      '--accent-color': '#14B8A6',
      '--tx-expense-color': '#F87171',
      '--tx-goal-color': '#FBBF24',
      '--tx-debtPayment-color': '#06B6D4',
      '--tx-income-color': '#22C55E',
      '--tx-transfer-color': '#14B8A6'
    }
  },
  {
    id: 'light-emerald',
    mode: 'light',
    nameKey: 'settings.theme.presets.names.lightEmerald',
    vars: {
      '--primary-color': '#FFFFFF',
      '--secondary-color': '#F0FDF4',
      '--background-color': '#F8FFF9',
      '--text-color': '#111827',
      '--accent-color': '#10B981',
      '--tx-expense-color': '#DC2626',
      '--tx-goal-color': '#D97706',
      '--tx-debtPayment-color': '#6366F1',
      '--tx-income-color': '#16A34A',
      '--tx-transfer-color': '#34D399'
    }
  },
  {
    id: 'light-amber',
    mode: 'light',
    nameKey: 'settings.theme.presets.names.lightAmber',
    vars: {
      '--primary-color': '#FFFFFF',
      '--secondary-color': '#FFFBEB',
      '--background-color': '#FFFDF5',
      '--text-color': '#1F2937',
      '--accent-color': '#F59E0B',
      '--tx-expense-color': '#DC2626',
      '--tx-goal-color': '#F59E0B',
      '--tx-debtPayment-color': '#A78BFA',
      '--tx-income-color': '#16A34A',
      '--tx-transfer-color': '#FBBF24'
    }
  }
]

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    themeVars: {},
    initialDefaults: {},
    loaded: false,
    amountFormat: 'full'
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
    async initTheme() {
      if (this.loaded) return

      const defaults = {}
      for (const { key } of EDITABLE_VARS) {
        defaults[key] = this._readCssVar(key)
      }
      this.initialDefaults = defaults

      let cached = {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) cached = JSON.parse(raw)
      } catch {}

      let remote = null
      if (auth.currentUser) {
        try {
          const { getThemeVars } = useUserPrefs()
          remote = await getThemeVars()
        } catch {}
      }

      this.themeVars = { ...defaults, ...cached, ...(remote || {}) }
      this._applyAll(this.themeVars)
      this.loaded = true

      if (remote) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.themeVars))
        } catch {}
      }
      try {
        const af = localStorage.getItem('fincontrol.amountFormat')
        if (af === 'compact' || af === 'full') this.amountFormat = af
      } catch {}
    },
    setVar(key, value) {
      this.themeVars[key] = value
      this._applyVar(key, value)
    },
    setAmountFormat(mode) {
      if (mode !== 'full' && mode !== 'compact') return
      this.amountFormat = mode
      try {
        localStorage.setItem('fincontrol.amountFormat', mode)
      } catch {}
    },
    async save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.themeVars))
      } catch {}

      if (auth.currentUser) {
        try {
          const { saveThemeVars } = useUserPrefs()
          await saveThemeVars(this.themeVars)
        } catch {}
      }
    },
    async reset() {
      this.themeVars = { ...this.initialDefaults }
      this._applyAll(this.themeVars)
      await this.save()
    },
    clearCacheOnLogout() {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      if (Object.keys(this.initialDefaults).length) {
        this.themeVars = { ...this.initialDefaults }
        this._applyAll(this.themeVars)
      }
      this.loaded = false
    },
    applyPreset(id) {
      const preset = THEME_PRESETS.find(p => p.id === id)
      if (!preset) return
      this.themeVars = { ...this.initialDefaults, ...preset.vars }
      this._applyAll(this.themeVars)
    }
  }
})
