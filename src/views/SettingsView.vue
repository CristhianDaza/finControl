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
const SettingsAccount = defineAsyncComponent(/* webpackChunkName: "settingsAccount" */() => import('@/components/settings/SettingsAccount.vue'))

const settings = useSettingsStore()

onMounted(() => {
  settings.initTheme()
})

const TABS = [
  { id: 'account', labelKey: 'settings.accountStatus' },
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
          <p class="subtitle">{{ t('settings.theme.subtitle') }}</p>
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

    <article
      class="card"
      v-show="activeTab==='account'"
      role="tabpanel"
      :id="'panel-account'"
      :aria-labelledby="'tab-account'"
    >
      <SettingsAccount />
    </article>

    <article
      class="card"
      v-show="activeTab==='language'"
      role="tabpanel"
      :id="'panel-language'"
      :aria-labelledby="'tab-language'"
    >
      <SettingsLanguage />
    </article>

    <article
      class="card"
      v-show="activeTab==='currencies'"
      role="tabpanel"
      :id="'panel-currencies'"
      :aria-labelledby="'tab-currencies'"
    >
      <SettingsCurrencies />
    </article>

    <article
      class="card"
      v-show="activeTab==='amount'"
      role="tabpanel"
      :id="'panel-amount'"
      :aria-labelledby="'tab-amount'"
    >
      <SettingsAmountFormat />
    </article>

    <article
      class="card"
      v-show="activeTab==='presets'"
      role="tabpanel"
      :id="'panel-presets'"
      :aria-labelledby="'tab-presets'"
    >
      <SettingsThemePresets />
    </article>

    <article
      class="card"
      v-show="activeTab==='theme'"
      role="tabpanel"
      :id="'panel-theme'"
      :aria-labelledby="'tab-theme'"
    >
      <SettingsThemeVars />
    </article>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 1rem;
  max-width: 980px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  display: flex;
  align-items: center;
  gap: .75rem;
}

.title .icon {
  width: 28px;
  height: 28px;
  color: var(--accent-color);
}

.title h1 {
  margin: 0;
  line-height: 1.1;
}

.subtitle {
  margin: .25rem 0 0;
  color: var(--muted-text-color);
}

/* Tabs */
.tabs {
  display: flex;
  gap: .5rem;
  flex-wrap: nowrap;
  border-bottom: 1px solid var(--secondary-color);
  padding-bottom: .5rem;
  position: sticky;
  top: 0;
  background: color-mix(in oklab, var(--primary-color) 90%, transparent);
  z-index: 2;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }

.tab {
  position: relative;
  appearance: none;
  border: 1px solid var(--secondary-color);
  background: var(--primary-color);
  color: var(--text-color);
  border-radius: 999px;
  padding: .45rem .9rem;
  font-size: .92rem;
  cursor: pointer;
  transition: background .15s ease, color .15s ease, box-shadow .15s ease, transform .08s ease;
}

.tab:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, var(--primary-color));
}

.tab:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.tab.active {
  background: var(--accent-color);
  color: var(--white);
  border-color: color-mix(in srgb, var(--accent-color) 60%, var(--secondary-color));
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent-color) 35%, transparent);
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -10px;
  height: 3px;
  border-radius: 3px;
  background: currentColor;
  opacity: .8;
}

.card {
  border-radius: 12px;
  background: var(--primary-color);
  border: 1px solid var(--secondary-color);
  box-shadow: 0 4px 14px var(--shadow-elev-1, rgba(0,0,0,.25));
  padding: 1rem;
}

.card + .card { margin-top: .25rem; }

.card-title { margin: 0 0 .25rem; font-size: 1.05rem; }
.card-subtitle { margin: 0 0 1rem; color: var(--muted-text-color); }

@media (max-width: 719.98px) {
  .page-header { margin-bottom: .25rem; }
  .card { padding: .85rem; }
}
</style>
