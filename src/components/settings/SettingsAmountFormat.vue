<script setup>
import { t } from '@/i18n/index.js'
import { useSettingsStore } from '@/stores/settings.js'
import { useAuthStore } from '@/stores/auth.js'

const settings = useSettingsStore()
const auth = useAuthStore()
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.amountFormat.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.amountFormat.subtitle') }}
    </p>
    <div class="amount-format-options">
      <label class="opt">
        <input
          type="radio"
          name="amount-format"
          value="full"
          :checked="settings.amountFormat === 'full'"
          @change="settings.setAmountFormat('full')"
          :disabled="!auth.canWrite"
        />
        <span>
          {{ t('settings.amountFormat.full') }}
        </span>
      </label>
      <label class="opt">
        <input
          type="radio"
          name="amount-format"
          value="compact"
          :checked="settings.amountFormat === 'compact'"
          @change="settings.setAmountFormat('compact')"
          :disabled="!auth.canWrite"
        />
        <span>
          {{ t('settings.amountFormat.compact') }}
        </span>
      </label>
    </div>
  </article>
</template>

<style scoped>
.amount-format-options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.amount-format-options .opt {
  display: flex;
  gap: .5rem;
  align-items: center;
  background: var(--secondary-color);
  padding: .6rem .8rem;
  border-radius: 8px;
  cursor: pointer;
}
.amount-format-options input[type=radio] {
  accent-color: var(--accent-color);
}
</style>
