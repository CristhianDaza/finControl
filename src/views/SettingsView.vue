<script setup>
import {
  onMounted,
  defineAsyncComponent,
  ref,
  nextTick,
  watch
} from 'vue'
import { useSettingsStore } from '@/stores/settings.js'
import { t } from '@/i18n/index.js'
import SettingsIcon from '@/assets/icons/settings.svg?raw'

const SettingsThemeVars = defineAsyncComponent(/* webpackChunkName: "settingsThemeVars" */() => import('@/components/settings/SettingsThemeVars.vue'))
const SettingsThemePresets = defineAsyncComponent(/* webpackChunkName: "settingsThemePresets" */() => import('@/components/settings/SettingsThemePresets.vue'))
const SettingsAmountFormat = defineAsyncComponent(/* webpackChunkName: "settingsAmountFormat" */() => import('@/components/settings/SettingsAmountFormat.vue'))
const SettingsCurrencies = defineAsyncComponent(/* webpackChunkName: "settingsCurrencies" */() => import('@/components/settings/SettingsCurrencies.vue'))
const SettingsLanguage = defineAsyncComponent(/* webpackChunkName: "settingsLanguage" */() => import('@/components/settings/SettingsLanguage.vue'))
const SettingsAccountUnified = defineAsyncComponent(/* webpackChunkName: "settingsAccountUnified" */() => import('@/components/settings/SettingsAccountUnified.vue'))

const settings = useSettingsStore()

onMounted(() => {
  settings.initTheme()
  nextTick(() => {
    const idx = tabIds.indexOf(activeTab.value)
    if (idx >= 0) {
      tabRefs.value[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  })
})

const TABS = [
  { id: 'account', labelKey: 'settings.account.unified.title' },
  { id: 'language', labelKey: 'settings.language.title' },
  { id: 'currencies', labelKey: 'settings.currencies.title' },
  { id: 'amount', labelKey: 'settings.amountFormat.title' },
  { id: 'presets', labelKey: 'settings.theme.presets.title' },
  { id: 'theme', labelKey: 'settings.theme.title' }
]

const LS_KEY = 'settings.activeTab'
const tabIds = TABS.map(tab => tab.id)
let initialTab = 'account'

try {
  const stored = localStorage.getItem(LS_KEY)
  if (stored && tabIds.includes(stored)) {
    initialTab = stored
  }
} catch {}

const activeTab = ref(initialTab)
const tabRefs = ref([])

watch(activeTab, value => {
  try {
    localStorage.setItem(LS_KEY, value)
  } catch {}
  nextTick(() => {
    const idx = tabIds.indexOf(value)
    if (idx >= 0) tabRefs.value[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  })
})

const onTabsKeydown = async (event, idx) => {
  const last = TABS.length - 1
  let nextIdx = idx

  if (event.key === 'ArrowRight') {
    nextIdx = idx === last ? 0 : idx + 1
  } else if (event.key === 'ArrowLeft') {
    nextIdx = idx === 0 ? last : idx - 1
  } else if (event.key === 'Home') {
    nextIdx = 0
  } else if (event.key === 'End') {
    nextIdx = last
  } else {
    return
  }

  event.preventDefault()
  activeTab.value = TABS[nextIdx].id
  await nextTick()
  tabRefs.value[nextIdx]?.focus()
}
</script>

<template>
  <section class="settings">
    <header class="page-header">
      <div class="title">
        <svg class="icon" v-html="SettingsIcon" aria-hidden="true"></svg>
        <div>
          <h1>{{ t('settings.title') }}</h1>
          <p class="subtitle">{{ t('settings.subtitle') }}</p>
        </div>
      </div>
    </header>

    <nav class="tabs" role="tablist" aria-label="Settings Sections">
      <button
        v-for="(tab, idx) in TABS"
        :key="tab.id"
        class="tab"
        role="tab"
        type="button"
        :id="`tab-${tab.id}`"
        :aria-controls="`panel-${tab.id}`"
        :class="{ active: activeTab === tab.id }"
        :tabindex="activeTab === tab.id ? 0 : -1"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
        @keydown="onTabsKeydown($event, idx)"
        :ref="el => { if (el) tabRefs[idx] = el }"
      >
        {{ t(tab.labelKey) }}
      </button>
    </nav>

    <div
      class="card-content"
      v-show="activeTab==='account'"
      role="tabpanel"
      :id="'panel-account'"
      aria-labelledby="tab-account"
    >
      <SettingsAccountUnified />
    </div>

    <div
      class="card-content"
      v-show="activeTab==='language'"
      role="tabpanel"
      :id="'panel-language'"
      aria-labelledby="tab-language"
    >
      <SettingsLanguage />
    </div>

    <div
      class="card-content"
      v-show="activeTab==='currencies'"
      role="tabpanel"
      :id="'panel-currencies'"
      aria-labelledby="tab-currencies"
    >
      <SettingsCurrencies />
    </div>

    <div
      class="card-content"
      v-show="activeTab==='amount'"
      role="tabpanel"
      :id="'panel-amount'"
      aria-labelledby="tab-amount"
    >
      <SettingsAmountFormat />
    </div>

    <div
      class="card-content"
      v-show="activeTab==='presets'"
      role="tabpanel"
      :id="'panel-presets'"
      aria-labelledby="tab-presets"
    >
      <SettingsThemePresets />
    </div>

    <div
      class="card-content"
      v-show="activeTab==='theme'"
      role="tabpanel"
      :id="'panel-theme'"
      aria-labelledby="tab-theme"
    >
      <SettingsThemeVars />
    </div>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 1rem;
  max-width: 980px;
  margin: 0 auto;
}

.settings-content {
  padding: 0;
}

.page-header {
  margin-bottom: 1rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title .icon {
  width: 2rem;
  height: 2rem;
  color: var(--accent-color);
}

.title h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-color);
}

.subtitle {
  margin: 0;
  color: var(--muted-text-color);
  font-size: 0.95rem;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--secondary-color);
  padding: 0.25rem;
  border-radius: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  background: transparent;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: var(--muted-text-color);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
}

.tab:hover {
  background: var(--primary-color);
  color: var(--text-color);
}

.tab.active {
  background: var(--accent-color);
  color: var(--white, #ffffff);
  font-weight: 600;
}

.tab:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--focus-accent-glow);
}

.card-content {
  background: var(--secondary-color);
  border-radius: 12px;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .settings {
    max-width: 100%;
    margin: 0;
    gap: 0.75rem;
  }

  .title {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .title .icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .tabs {
    padding: 0.125rem;
  }

  .tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .card {
    padding: 1rem;
  }
}
</style>
