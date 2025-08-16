<script setup>
import { t } from '@/i18n/index.js'
const props = defineProps({ open: Boolean, title: String, message: String, confirmText: { type: String, default: '' }, cancelText: { type: String, default: '' } })
const emit = defineEmits(['update:open','confirm','cancel'])
const close = () => emit('update:open', false)
const onCancel = () => { emit('cancel'); close() }
const onConfirm = () => { emit('confirm'); close() }
const onOverlay = (e) => { if (e.target === e.currentTarget) onCancel() }
const onKey = (e) => { if (e.key === 'Escape') onCancel() }
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="modal-overlay" @click="onOverlay" @keydown.esc.prevent.stop="onCancel" tabindex="-1" @keyup="onKey">
      <div role="dialog" aria-modal="true" class="card modal-card">
        <h2 class="modal-title">{{ title }}</h2>
        <p class="modal-message">{{ message }}</p>
        <div class="actions">
          <button class="button" @click="onConfirm">{{ confirmText || t('common.confirm') }}</button>
          <button class="button button-secondary" @click="onCancel">{{ cancelText || t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000}
.modal-card{max-width:420px;width:100%}
.modal-title{margin:0 0 .5rem 0;color:var(--accent-color)}
.modal-message{margin:0 0 1rem 0}
.actions{display:flex;gap:.75rem;justify-content:flex-end}
</style>
