<script setup>
import { computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { useSettingsStore, EDITABLE_VARS } from '@/stores/settings.js'
import { useAuthStore } from '@/stores/auth.js'

const settings = useSettingsStore()
const auth = useAuthStore()
const { success: notifySuccess } = useNotify()

const onInput = (key, e) => {
  settings.setVar(key, e.target.value)
}

const save = async () => {
  await settings.save()
  notifySuccess(t('settings.notifications.saved'))
}

const reset = async () => {
  await settings.reset()
  notifySuccess(t('settings.notifications.reset'))
}

const vars = computed(() => EDITABLE_VARS)
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.theme.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.theme.subtitle') }}
    </p>
    <div class="vars-grid">
      <div
        v-for="v in vars"
        :key="v.key"
        class="row"
      >
        <label
          class="row-label"
          :for="v.key"
        >
          {{ v.label }}
        </label>
        <div class="controls">
          <div class="color-wrap">
            <input
              class="color"
              :id="v.key"
              type="color"
              :value="settings.themeVars[v.key]"
              @input="onInput(v.key, $event)"
              :aria-label="v.label"
              :disabled="!auth.canWrite"
            />
          </div>
          <input
            class="text"
            type="text"
            :value="settings.themeVars[v.key]"
            @input="onInput(v.key, $event)"
            inputmode="text"
            spellcheck="false"
            :disabled="!auth.canWrite"
          />
        </div>
      </div>
    </div>

    <div class="preview">
      <h2 class="card-title">
        {{ t('settings.preview') }}
      </h2>
      <p class="card-subtitle">
        {{ t('settings.previewDesc') }}
      </p>
      <div class="badges">
        <span class="badge badge-expense">
          {{ t('transactions.form.expense') }}
        </span>
        <span class="badge badge-goal">
          {{ t('transactions.form.goalSaving') }}
        </span>
        <span class="badge badge-debt">
          {{ t('transactions.form.debtPayment') }}
        </span>
        <span class="badge badge-income">
          {{ t('transactions.form.income') }}
        </span>
        <span class="badge badge-transfer">
          {{ t('common.transfer') }}
        </span>
      </div>
      <div class="buttons">
        <button
          class="button"
          :disabled="!auth.canWrite"
        >
          {{ t('settings.samplePrimary') }}
        </button>
        <button
          class="button button-secondary"
          :disabled="!auth.canWrite"
        >
          {{ t('settings.sampleSecondary') }}
        </button>
      </div>
    </div>

    <div class="actions">
      <button
        class="button button-secondary"
        @click="reset"
        :disabled="!auth.canWrite"
      >
        {{ t('settings.reset') }}
      </button>
      <button
        class="button"
        @click="save"
        :disabled="!auth.canWrite"
      >
        {{ t('common.save') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
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

.row-label {
  font-weight: 600;
  font-size: .95rem;
}

.controls {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .6rem;
  align-items: center;
}

.color-wrap {
  width: 48px;
  height: 38px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--primary-color);
  background: var(--secondary-color);
  display: grid;
  place-items: center;
}

.color {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: transparent;
}

.color::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

.color::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}

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

.preview {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--background-color);
  border: 1px solid var(--secondary-color);
  box-shadow: 0 2px 8px var(--shadow-elev-1, rgba(0,0,0,.2));
}

.preview .badges {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: .3rem .6rem;
  border-radius: 999px;
  font-size: .8rem;
}

.preview .buttons {
  margin-top: 1rem;
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
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

@media (min-width: 720px) {
  .vars-grid .row {
    grid-template-columns: 220px 1fr;
    align-items: center;
  }
}

.badge-expense {
  background: var(--tx-expense-color);
  color: var(--white);
}

.badge-goal {
  background: var(--tx-goal-color);
  color: var(--black);
}

.badge-debt {
  background: var(--tx-debtPayment-color);
  color: var(--white);
}

.badge-income {
  background: var(--tx-income-color);
  color: var(--white);
}

.badge-transfer {
  background: var(--tx-transfer-color);
  color: var(--black);
}
</style>
