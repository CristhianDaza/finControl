<script setup>
import { computed } from 'vue'
import { localeRef, setLocale, t } from '@/i18n/index.js'

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})

const current = computed(() => localeRef.value)
const set = lng => setLocale(lng)
const alt = computed(() => current.value === 'es' ? 'en' : 'es')
</script>

<template>
  <div
    class="lang-switcher"
    role="group"
    :aria-label="t('language.switcher')"
  >
    <template v-if="!props.collapsed">
      <button
        class="chip"
        :class="{ active: current==='es' }"
        @click="set('es')"
        type="button"
        :aria-pressed="current==='es'"
      >
        ES
      </button>
      <button
        class="chip"
        :class="{ active: current==='en' }"
        @click="set('en')"
        type="button"
        :aria-pressed="current==='en'"
      >
        EN
      </button>
    </template>
    <template v-else>
      <button
        class="chip"
        type="button"
        @click="set(alt)"
      >
        {{ String(alt).toUpperCase() }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.chip {
  background: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
  padding: .25rem .5rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: .8rem;
}
.chip.active {
  background: var(--accent-color);
  color: var(--background-color);
}
.chip:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
</style>
