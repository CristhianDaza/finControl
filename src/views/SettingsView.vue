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
  <section>
    <div class="page-header">
      <div class="title">
        <svg class="icon" v-html="SettingsIcon"></svg>
        <div>
          <h1>{{ t('settings.title') }}</h1>
          <p class="subtitle">{{ t('settings.theme.subtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin:0 0 .5rem">{{ t('settings.theme.presets.title') }}</h2>
      <p style="margin:0 0 1rem;color:var(--muted-text-color)">{{ t('settings.theme.presets.subtitle') }}</p>

      <div class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.light') }}</h3>
        <div class="presets">
          <button v-for="p in lightPresets" :key="p.id" class="preset" type="button" @click="applyPreset(p.id)" :aria-label="t(p.nameKey)">
            <span class="swatches">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </div>

      <div class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.dark') }}</h3>
        <div class="presets">
          <button v-for="p in darkPresets" :key="p.id" class="preset" type="button" @click="applyPreset(p.id)" :aria-label="t(p.nameKey)">
            <span class="swatches">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </div>

      <p style="margin:1rem 0 0;color:var(--muted-text-color)">{{ t('settings.theme.presets.hint') }}</p>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin:0 0 .75rem">{{ t('settings.theme.title') }}</h2>
      <p style="margin:0 0 1rem;color:var(--muted-text-color)">{{ t('settings.theme.subtitle') }}</p>

      <div class="grid">
        <div v-for="v in EDITABLE_VARS" :key="v.key" class="row">
          <label :for="v.key">{{ v.label }}</label>
          <input :id="v.key" type="color" :value="settings.themeVars[v.key]" @input="onInput(v.key, $event)" />
          <input class="text" type="text" :value="settings.themeVars[v.key]" @input="onInput(v.key, $event)" />
        </div>
      </div>

      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem">
        <button class="button button-secondary" @click="reset">{{ t('settings.reset') }}</button>
        <button class="button" @click="save">{{ t('common.save') }}</button>
      </div>
    </div>

    <div class="preview card">
      <h2>{{ t('settings.preview') }}</h2>
      <p>{{ t('settings.previewDesc') }}</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <span class="badge" :style="{background: 'var(--tx-expense-color)', color: 'var(--white)'}">{{ t('transactions.form.expense') }}</span>
        <span class="badge" :style="{background: 'var(--tx-goal-color)', color: 'var(--black)'}">{{ t('transactions.form.goalSaving') }}</span>
        <span class="badge" :style="{background: 'var(--tx-debtPayment-color)', color: 'var(--white)'}">{{ t('transactions.form.debtPayment') }}</span>
        <span class="badge" :style="{background: 'var(--tx-income-color)', color: 'var(--white)'}">{{ t('transactions.form.income') }}</span>
        <span class="badge" :style="{background: 'var(--tx-transfer-color)', color: 'var(--black)'}">{{ t('common.transfer') }}</span>
      </div>
      <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="button">{{ t('settings.samplePrimary') }}</button>
        <button class="button button-secondary">{{ t('settings.sampleSecondary') }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-header { display:flex; align-items:center; justify-content: space-between; margin: 0 0 1rem; }
.title { display:flex; align-items:center; gap:.75rem; }
.title .icon { width:28px; height:28px; color: var(--accent-color) }
.title h1 { margin:0; }
.subtitle { margin:.25rem 0 0; color: var(--muted-text-color); }

.preset-group { margin: .25rem 0 1rem; }
.group-title { margin: 0 0 .5rem; font-size: .95rem; opacity: .9; }
.presets { display:flex; gap:.5rem; flex-wrap:wrap; }
.preset { display:flex; align-items:center; gap:.5rem; padding:.5rem .6rem; border:1px solid var(--secondary-color); background: var(--primary-color); color: var(--text-color); border-radius: 8px; cursor:pointer; box-shadow: 0 1px 3px var(--shadow-elev-1); }
.preset:hover { filter: brightness(1.03); }
.preset:focus { outline: 2px solid var(--accent-color); outline-offset: 2px; }
.swatches { display:flex; gap:2px; }
.sw { width:14px; height:14px; border-radius:3px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
.preset-name { font-size: .9rem; }

.grid { display:grid; grid-template-columns: 1fr auto 260px; gap:.75rem 1rem; align-items:center }
.row label { font-weight:600 }
.row input[type="color"] { width: 44px; height: 36px; padding:0; border: none; background: transparent }
.row input.text { background: var(--secondary-color); color: var(--text-color); border:1px solid var(--primary-color); border-radius:6px; padding:.5rem; width:100% }

.badge { display:inline-block; padding:.25rem .5rem; border-radius:999px; font-size:.8rem }

@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr auto; }
}
</style>
