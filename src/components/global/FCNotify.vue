<script setup>
import { computed } from 'vue'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'
const { state, remove } = useNotify()
const toasts = computed(()=>state.toasts)
const roleFor = (type) => type === 'error' ? 'alert' : 'status'
const liveFor = (type) => type === 'error' ? 'assertive' : 'polite'
</script>

<template>
  <teleport to="body">
    <div class="fc-notify" aria-live="polite" aria-atomic="false">
      <transition-group name="toast" tag="div">
        <div
          v-for="tst in toasts"
          :key="tst.id"
          class="toast"
          :class="tst.type"
          :role="roleFor(tst.type)"
          :aria-live="liveFor(tst.type)"
        >
          <div class="toast-content">
            <div class="toast-icon" aria-hidden="true"></div>
            <div class="toast-message">{{ tst.message }}</div>
            <button class="toast-close" :aria-label="t('notification.dismiss')" @click="remove(tst.id)">×</button>
          </div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style scoped>
.fc-notify{position:fixed;right:16px;top:16px;display:flex;flex-direction:column;gap:8px;z-index:11000;max-width:min(92vw,380px)}
.toast{background:var(--primary-color);color:var(--text-color);border:1px solid var(--secondary-color);padding:.75rem 1rem;border-radius:12px;box-shadow:0 8px 24px var(--shadow-elev-2);overflow:hidden}
.toast .toast-content{display:grid;grid-template-columns:auto 1fr auto;gap:.5rem;align-items:center}
.toast .toast-icon{width:18px;height:18px;border-radius:50%}
.toast.success{border-left:4px solid var(--success-color)}
.toast.error{border-left:4px solid var(--error-color)}
.toast.info{border-left:4px solid var(--info-color)}
.toast.warn{border-left:4px solid var(--warning-color)}
.toast.success .toast-icon{background:var(--success-color)}
.toast.error .toast-icon{background:var(--error-color)}
.toast.info .toast-icon{background:var(--info-color)}
.toast.warn .toast-icon{background:var(--warning-color)}
.toast-message{line-height:1.2}
.toast-close{background:transparent;border:0;color:inherit;font-size:1.1rem;cursor:pointer;line-height:1;padding:.25rem;border-radius:6px}
.toast-close:hover{background:var(--secondary-color)}

/* Animations */
.toast-enter-active,.toast-leave-active{transition:opacity .18s ease, transform .18s ease}
.toast-enter-from{opacity:0;transform:translateY(-8px)}
.toast-leave-to{opacity:0;transform:translateY(8px)}
</style>
