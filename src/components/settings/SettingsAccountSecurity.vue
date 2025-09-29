<script setup>
import { ref, computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase.js'

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
</style>
