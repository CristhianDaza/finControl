<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { t } from '@/i18n/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase.js'
import { useDataCleanup } from '@/composables/useDataCleanup.js'

const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fcConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))

const store = useAuthStore()
const notify = useNotify()
const sending = ref(false)
const email = computed(() => store.user?.email || '')

const onResetPassword = async () => {
  if (!email.value || sending.value) return
  sending.value = true
  try {
    await sendPasswordResetEmail(auth, email.value)
    notify.success(t('settings.account.resetSent', { email: email.value }))
  } catch {
    notify.error(t('settings.account.resetError'))
  } finally {
    sending.value = false
  }
}

const confirmOpen = ref(false)
const deleting = ref(false)
const { deleteAllUserData } = useDataCleanup()
const canWrite = computed(() => store.canWrite)

const confirmInput = ref('')
const confirmWord = computed(() => t('settings.account.delete.confirmWord'))
const isUnlock = computed(() => confirmInput.value.trim() === String(confirmWord.value || ''))

const onRequestDelete = () => {
  if (!canWrite.value || deleting.value || !isUnlock.value) return
  confirmOpen.value = true
}

const onConfirmDelete = async () => {
  if (deleting.value) return
  deleting.value = true
  try {
    await deleteAllUserData()
    notify.success(t('settings.account.delete.success'))
    confirmInput.value = ''
  } catch {
    notify.error(t('settings.account.delete.error'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <article class="card">
    <h2 class="card-title">{{ t('settings.account.title') }}</h2>
    <p class="card-subtitle">{{ t('settings.account.subtitle') }}</p>
    <div class="account-actions">
      <button
        class="button"
        type="button"
        :disabled="!email || sending"
        :aria-busy="sending"
        @click="onResetPassword"
      >
        {{ sending ? t('common.loading') : t('settings.account.changePassword') }}
      </button>
      <small class="muted" v-if="email">{{ email }}</small>
    </div>
    <div class="danger-zone">
      <h3 class="danger-title">{{ t('settings.account.delete.title') }}</h3>
      <p class="danger-subtitle">{{ t('settings.account.delete.subtitle') }}</p>
      <div class="form-field">
        <label>{{ t('settings.account.delete.typeToEnable', { word: confirmWord }) }}</label>
        <input
          class="input"
          v-model="confirmInput"
          :placeholder="t('settings.account.delete.inputPlaceholder', { word: confirmWord })"
        />
      </div>
      <button
        class="button button-danger"
        type="button"
        :disabled="!canWrite || deleting || !isUnlock"
        :aria-busy="deleting"
        :title="!canWrite ? t('access.readOnly') : ''"
        @click="onRequestDelete"
      >
        {{ deleting ? t('common.loading') : t('settings.account.delete.action') }}
      </button>
    </div>
    <FCConfirmModal
      v-model:open="confirmOpen"
      :title="t('settings.account.delete.confirmTitle')"
      :message="t('settings.account.delete.confirmMessage')"
      :confirm-text="t('settings.account.delete.confirmCta')"
      :cancel-text="t('common.cancel')"
      :confirm-disabled="deleting"
      @confirm="onConfirmDelete"
    />
  </article>
</template>

<style scoped>
.account-actions {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-wrap: wrap;
}
.muted {
  color: var(--muted-text-color);
}
.danger-zone {
  margin-top: 1rem;
  padding-top: .75rem;
  border-top: 1px dashed var(--secondary-color);
  display: grid;
  gap: .5rem;
}
.danger-title {
  margin: 0;
  font-size: 1rem;
  color: var(--error-color);
}
.danger-subtitle {
  margin: 0;
  color: var(--muted-text-color);
}
.button-danger {
  background: var(--error-color);
  color: var(--white);
  border-color: color-mix(in srgb, var(--error-color) 70%, var(--secondary-color));
}
.button-danger:hover {
  filter: brightness(0.95);
}
.button-danger[disabled] {
  opacity: .6;
  cursor: not-allowed;
}
.form-field {
  display: grid;
  gap: .4rem;
}
.input {
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  padding: .65rem .75rem;
  border-radius: 8px;
  color: var(--text-color);
}
.input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}
</style>
