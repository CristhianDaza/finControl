<script setup>
import { onMounted, computed } from 'vue'
import { useSettingsStore, EDITABLE_VARS, THEME_PRESETS } from '@/stores/settings.js'
import { t } from '@/i18n/index.js'
import SettingsIcon from '@/assets/icons/settings.svg?raw'

const settings = useSettingsStore()

onMounted(() => {
  settings.initTheme()
})

const onInput = (key, e) => {
  settings.setVar(key, e.target.value)
}

const save = () => settings.save()
const reset = () => settings.reset()

const lightPresets = computed(() => THEME_PRESETS.filter(p => p.mode === 'light'))
const darkPresets = computed(() => THEME_PRESETS.filter(p => p.mode === 'dark'))
const applyPreset = (id) => settings.applyPreset(id)
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

    <article class="card">
      <h2 class="card-title">{{ t('settings.theme.presets.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.theme.presets.subtitle') }}</p>

      <section class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.light') }}</h3>
        <div class="presets-grid">
          <button
              v-for="p in lightPresets"
              :key="p.id"
              class="preset"
              type="button"
              @click="applyPreset(p.id)"
              :aria-label="t(p.nameKey)"
          >
            <span class="swatches" aria-hidden="true">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </section>

      <section class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.dark') }}</h3>
        <div class="presets-grid">
          <button
            v-for="p in darkPresets"
            :key="p.id"
            class="preset"
            type="button"
            @click="applyPreset(p.id)"
            :aria-label="t(p.nameKey)"
          >
            <span class="swatches" aria-hidden="true">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </section>

      <p class="hint">{{ t('settings.theme.presets.hint') }}</p>
    </article>

    <article class="card">
      <h2 class="card-title">{{ t('settings.theme.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.theme.subtitle') }}</p>

      <div class="vars-grid">
        <div v-for="v in EDITABLE_VARS" :key="v.key" class="row">
          <label class="row-label" :for="v.key">{{ v.label }}</label>
          <div class="controls">
            <div class="color-wrap">
              <input
                class="color"
                :id="v.key"
                type="color"
                :value="settings.themeVars[v.key]"
                @input="onInput(v.key, $event)"
                :aria-label="v.label"
              />
            </div>
            <input
              class="text"
              type="text"
              :value="settings.themeVars[v.key]"
              @input="onInput(v.key, $event)"
              inputmode="text"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="button button-secondary" @click="reset">{{ t('settings.reset') }}</button>
        <button class="button" @click="save">{{ t('common.save') }}</button>
      </div>
    </article>

    <article class="card preview">
      <h2 class="card-title">{{ t('settings.preview') }}</h2>
      <p class="card-subtitle">{{ t('settings.previewDesc') }}</p>

      <div class="badges">
        <span class="badge" :style="{background: 'var(--tx-expense-color)', color: 'var(--white)'}">{{ t('transactions.form.expense') }}</span>
        <span class="badge" :style="{background: 'var(--tx-goal-color)', color: 'var(--black)'}">{{ t('transactions.form.goalSaving') }}</span>
        <span class="badge" :style="{background: 'var(--tx-debtPayment-color)', color: 'var(--white)'}">{{ t('transactions.form.debtPayment') }}</span>
        <span class="badge" :style="{background: 'var(--tx-income-color)', color: 'var(--white)'}">{{ t('transactions.form.income') }}</span>
        <span class="badge" :style="{background: 'var(--tx-transfer-color)', color: 'var(--black)'}">{{ t('common.transfer') }}</span>
      </div>

      <div class="buttons">
        <button class="button">{{ t('settings.samplePrimary') }}</button>
        <button class="button button-secondary">{{ t('settings.sampleSecondary') }}</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title { display:flex; align-items:center; gap:.75rem; }
.title .icon { width:28px; height:28px; color: var(--accent-color); }
.title h1 { margin:0; line-height:1.1; }
.subtitle { margin:.25rem 0 0; color: var(--muted-text-color); }

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

.preset-group { margin: .25rem 0 1rem; }
.group-title { margin: 0 0 .5rem; font-size: .95rem; opacity: .9; }

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: .6rem;
}
.preset {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: .5rem;
  width: 100%;
  padding: .65rem .7rem;
  border: 1px solid var(--secondary-color);
  background: var(--primary-color);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  box-shadow: 0 1px 3px var(--shadow-elev-1, rgba(0,0,0,.2));
  text-align: left;
}
.preset:hover { transform: translateY(-1px); filter: brightness(1.03); }
.preset:focus { outline: 2px solid var(--accent-color); outline-offset: 2px; }
.swatches { display:flex; gap:3px; }
.sw { width:16px; height:16px; border-radius:4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
.preset-name { font-size: .9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hint { margin: .75rem 0 0; color: var(--muted-text-color); }

.vars-grid {
  display: grid;
  gap: .75rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: .5rem;
  padding: .5rem;
  border-radius: 8px;
  background: color-mix(in oklab, var(--secondary-color) 85%, transparent);
  border: 1px solid var(--secondary-color);
}
.row-label { font-weight: 600; font-size: .95rem; }
.controls {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .6rem;
  align-items: center;
}

.color-wrap {
  width: 48px; height: 38px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--primary-color);
  background: var(--secondary-color);
  display: grid; place-items: center;
}
.color {
  appearance: none;
  -webkit-appearance: none;
  width: 100%; height: 100%;
  border: none; padding: 0; cursor: pointer;
  background: transparent;
}
.color::-webkit-color-swatch-wrapper { padding: 0; }
.color::-webkit-color-swatch { border: none; border-radius: 6px; }
.color::-moz-color-swatch { border: none; border-radius: 6px; }

.text {
  background: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  padding: .6rem .7rem;
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .9rem;
}

.actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
  margin-top: 1rem;
  position: sticky;
  bottom: .5rem;
  background: color-mix(in oklab, var(--primary-color) 80%, transparent);
  padding-top: .5rem;
}

.preview .badges {
  display:flex; gap:.5rem; flex-wrap:wrap;
}
.badge { display:inline-block; padding:.3rem .6rem; border-radius:999px; font-size:.8rem }
.preview .buttons {
  margin-top: 1rem;
  display:flex; gap:.5rem; flex-wrap:wrap;
}

@media (min-width: 720px) {
  .vars-grid .row {
    grid-template-columns: 220px 1fr;
    align-items: center;
  }
}

@media (max-width: 719.98px) {
  .page-header { margin-bottom: .25rem; }
  .card { padding: .85rem; }
  .color-wrap { width: 44px; height: 36px; }
  .preset { padding: .6rem; }
}
</style>
