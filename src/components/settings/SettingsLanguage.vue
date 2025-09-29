<script setup>
import { computed } from 'vue'
import { t, setLocale, localeRef } from '@/i18n/index.js'
import { useUserPrefs } from '@/composables/useUserPrefs.js'
import { useNotify } from '@/components/global/fcNotify.js'

const { saveAppPrefs } = useUserPrefs()
const { success: notifySuccess } = useNotify()

const selectedLang = computed({
  get: () => localeRef.value,
  set: async (val) => {
    await setLocale(val)
    try { await saveAppPrefs({ language: val }) } catch {}
    notifySuccess(t('settings.language.saved'))
  }
})
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.language.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.language.subtitle') }}
    </p>
    <div class="form-field">
      <label for="app-language">
        {{ t('settings.language.label') }}
      </label>
      <select
        id="app-language"
        class="input"
        v-model="selectedLang"
      >
        <option value="es">
          Español (ES)
        </option>
        <option value="en">
          English (EN)
        </option>
      </select>
    </div>
  </article>
</template>

<style scoped>
</style>

