<script setup>
import { computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useSettingsStore, THEME_PRESETS } from '@/stores/settings.js'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'

const settings = useSettingsStore()
const auth = useAuthStore()
const { success: notifySuccess } = useNotify()

const lightPresets = computed(() =>
  THEME_PRESETS.filter(p => p.mode === 'light')
)

const darkPresets = computed(() =>
  THEME_PRESETS.filter(p => p.mode === 'dark')
)

const applyPreset = id => {
  if (auth.canWrite) settings.applyPreset(id)
}

const save = async () => {
  await settings.save()
  notifySuccess(t('settings.notifications.saved'))
}
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.theme.presets.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.theme.presets.subtitle') }}
    </p>

    <section class="preset-group">
      <h3 class="group-title">
        {{ t('settings.theme.presets.light') }}
      </h3>
      <div class="presets-grid">
        <button
          v-for="p in lightPresets"
          :key="p.id"
          class="preset"
          type="button"
          @click="applyPreset(p.id)"
          :aria-label="t(p.nameKey)"
          :disabled="!auth.canWrite"
        >
          <span class="swatches" aria-hidden="true">
            <span
              class="sw"
              :style="{ background: p.vars['--background-color'] }"
              title="bg"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--primary-color'] }"
              title="primary"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--secondary-color'] }"
              title="secondary"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--accent-color'] }"
              title="accent"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--text-color'] }"
              title="text"
            ></span>
          </span>
          <span class="preset-name">
            {{ t(p.nameKey) }}
          </span>
        </button>
      </div>
    </section>

    <section class="preset-group">
      <h3 class="group-title">
        {{ t('settings.theme.presets.dark') }}
      </h3>
      <div class="presets-grid">
        <button
          v-for="p in darkPresets"
          :key="p.id"
          class="preset"
          type="button"
          @click="applyPreset(p.id)"
          :aria-label="t(p.nameKey)"
          :disabled="!auth.canWrite"
        >
          <span class="swatches" aria-hidden="true">
            <span
              class="sw"
              :style="{ background: p.vars['--background-color'] }"
              title="bg"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--primary-color'] }"
              title="primary"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--secondary-color'] }"
              title="secondary"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--accent-color'] }"
              title="accent"
            ></span>
            <span
              class="sw"
              :style="{ background: p.vars['--text-color'] }"
              title="text"
            ></span>
          </span>
          <span class="preset-name">
            {{ t(p.nameKey) }}
          </span>
        </button>
      </div>
    </section>

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

    <p class="hint">
      {{ t('settings.theme.presets.hint') }}
    </p>

    <div class="actions">
      <button
        class="button"
        type="button"
        @click="save"
        :disabled="!auth.canWrite"
      >
        {{ t('common.save') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.preset-group {
  margin: .25rem 0 1rem;
}
.group-title {
  margin: 0 0 .5rem;
  font-size: .95rem;
  opacity: .9;
}
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
.preset:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}
.preset:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
.swatches {
  display: flex;
  gap: 3px;
}
.sw {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.15);
}
.preset-name {
  font-size: .9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  margin: .75rem 0 0;
  color: var(--muted-text-color);
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
