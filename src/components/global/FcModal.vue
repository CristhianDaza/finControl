<script setup>
import { t } from '@/i18n/index.js'
defineProps({
  showModal: {
    type: Boolean,
    default: false,
    required: true
  },
  titleModal: {
    type: String,
    default: () => t('common.confirm')
  }
})

const emit = defineEmits(['update:showModal', 'accept', 'cancel-modal'])

const cancel = () => {
  emit('cancel-modal')
  emit('update:showModal', false)
}

const accept = () => {
  emit('accept')
  emit('update:showModal', false)
}
</script>

<template>
  <transition name="fade">
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="cancel">
        <div class="modal-content" role="dialog" aria-modal="true">
          <header class="modal-header">
            <h2 class="modal-title">
              {{ titleModal }}
            </h2>
          </header>

          <div class="modal-body">
            <slot />
          </div>

          <footer class="modal-footer">
            <button class="btn cancel" @click="cancel">{{ t('common.cancel') }}</button>
            <button class="btn accept" @click="accept">{{ t('common.confirm') }}</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  backdrop-filter: blur(8px);
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  width: 90vw;
  max-width: 720px;
  max-height: 90dvh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  flex: 0 0 auto;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  border-left: 4px solid var(--accent-color);
  padding-left: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.modal-body {
  display: block;
  overflow-y: auto;
  padding-right: 0.25rem;
  flex: 1 1 auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  flex: 0 0 auto;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cancel {
  background-color: var(--secondary-color);
  color: var(--text-color);
}

.cancel:hover {
  background-color: var(--hover-secondary-color);
}

.accept {
  background-color: var(--accent-color);
  color: var(--background-color);
}

.accept:hover {
  background-color: var(--hover-accent-color);
}
</style>
