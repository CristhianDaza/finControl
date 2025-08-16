<script setup>
import { onMounted } from 'vue'
import { useSettingsStore, EDITABLE_VARS } from '@/stores/settings.js'
import { t } from '@/i18n/index.js'

const settings = useSettingsStore()

onMounted(() => {
  settings.initTheme()
})

const onInput = (key, e) => {
  settings.setVar(key, e.target.value)
}

const save = () => settings.save()
const reset = () => settings.reset()
</script>

<template>
  <section>
    <h1 style="margin:0 0 1rem">{{ t('settings.title') }}</h1>
    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin:0 0 .75rem">{{ t('settings.theme.title') }}</h2>
      <p style="margin:0 0 1rem;color:var(--muted-text-color)">{{ t('settings.theme.subtitle') }}</p>

      <div class="grid">
        <div v-for="v in EDITABLE_VARS" :key="v.key" class="row">
          <label :for="v.key">{{ v.label }} <small style="opacity:.7">({{ v.key }})</small></label>
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
.grid { display:grid; grid-template-columns: 1fr auto 260px; gap:.75rem 1rem; align-items:center }
.row label { font-weight:600 }
.row input[type="color"] { width: 44px; height: 36px; padding:0; border: none; background: transparent }
.row input.text { background: var(--secondary-color); color: var(--text-color); border:1px solid var(--primary-color); border-radius:6px; padding:.5rem; width:100% }

.badge { display:inline-block; padding:.25rem .5rem; border-radius:999px; font-size:.8rem }

@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
