<script setup>
import { computed, ref, watch } from 'vue'
import { useGlobalLoadingStore } from '@/stores/loading.js'
import { t } from '@/i18n/index.js'

const loading = useGlobalLoadingStore()

const visible = ref(false)
const MIN_VISIBLE_MS = 400
const SHOW_DELAY_MS = 180
let showTimer = null
let hideTimer = null
let becameVisibleAt = 0

watch(() => loading.isLoading, (val) => {
  if (val) {
    clearTimeout(hideTimer)
    if (visible.value) return
    showTimer = setTimeout(() => { visible.value = true; becameVisibleAt = performance.now() }, SHOW_DELAY_MS)
  } else {
    clearTimeout(showTimer)
    if (!visible.value) return
    const elapsed = performance.now() - becameVisibleAt
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
    hideTimer = setTimeout(() => { visible.value = false }, remaining)
  }
})

const activeCount = computed(() => loading.active)
</script>

<template>
  <transition name="fc-gl-loader-fade">
    <div v-if="visible" class="fc-gl-loader" role="status" aria-live="polite" :data-active="activeCount">
      <div class="fc-gl-loader__backdrop" />
      <div class="fc-gl-loader__content">
        <div class="fc-gl-loader__spinner">
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="ring"></div>
        </div>
        <p class="fc-gl-loader__text">{{ t('common.loading') }}</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fc-gl-loader { position: fixed; inset: 0; display: grid; place-items: center; z-index: 9999; pointer-events: none; }
.fc-gl-loader__backdrop { position: absolute; inset: 0; background:
    radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent-color) 28%, transparent), color-mix(in srgb, var(--overlay-50) 85%, transparent)),
    var(--overlay-50);
  backdrop-filter: blur(4px); }
.fc-gl-loader__content { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2.2rem 2.6rem; border-radius: 20px; background: linear-gradient(145deg, var(--secondary-color) 0%, var(--primary-color) 60%); box-shadow: 0 8px 32px -8px var(--shadow-elev-4), 0 0 0 1px rgba(255,255,255,0.04); pointer-events: auto; }
.fc-gl-loader__text { margin: 0; font-weight: 600; letter-spacing: .5px; color: var(--text-color); text-shadow: 0 1px 2px rgba(0,0,0,.4); }

.fc-gl-loader__spinner { --sz: 70px; width: var(--sz); height: var(--sz); position: relative; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--primary-color) 70%, transparent), color-mix(in srgb, var(--secondary-color) 92%, transparent)); backdrop-filter: blur(2px); }
.fc-gl-loader__spinner::before { content: ""; position: absolute; inset: -6px; border-radius: 50%; background: linear-gradient(135deg, color-mix(in srgb, var(--secondary-color) 55%, transparent), color-mix(in srgb, var(--primary-color) 85%, transparent)); filter: blur(4px); opacity: .55; }
.fc-gl-loader__spinner .ring { position: absolute; inset: 0; border-radius: 50%; border: 4px solid transparent; animation: fc-gl-spin 1.2s linear infinite;  mix-blend-mode: normal; }
.fc-gl-loader__spinner .ring:nth-child(1) { border-top-color: var(--accent-color); border-bottom-color: var(--accent-color); filter: drop-shadow(0 0 4px var(--accent-color)); }
.fc-gl-loader__spinner .ring:nth-child(2) { border-left-color: var(--success-color); border-right-color: var(--success-color); animation-direction: reverse; animation-duration: 1.4s; filter: drop-shadow(0 0 4px var(--success-color)); }
.fc-gl-loader__spinner .ring:nth-child(3) { border-top-color: var(--debt-color); border-left-color: var(--debt-color); animation-duration: 1.1s; filter: drop-shadow(0 0 4px var(--debt-color)); }

@keyframes fc-gl-spin { to { transform: rotate(360deg); } }

.fc-gl-loader-fade-enter-active, .fc-gl-loader-fade-leave-active { transition: opacity .35s ease, transform .4s ease; }
.fc-gl-loader-fade-enter-from, .fc-gl-loader-fade-leave-to { opacity: 0; transform: scale(.98); }
</style>
