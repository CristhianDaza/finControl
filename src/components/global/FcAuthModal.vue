<script setup>
import { ref, defineAsyncComponent, computed, watch, onUnmounted } from 'vue'
import { t } from '@/i18n/index.js'

const FcFormField = defineAsyncComponent(/* webpackChunkName: "fcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  show: Boolean,
  mode: {
    type: String,
    default: 'login'
  }
})

const emit = defineEmits(['accept-button', 'cancel-button'])

const email = ref('')
const password = ref('')

const isLogin = computed(() => props.mode === 'login')

const handleAccept = () => {
  emit('accept-button', {
    email: email.value,
    password: password.value,
    isLogin: isLogin.value
  })
}

const handleCancel = () => {
  emit('cancel-button')
  email.value = ''
  password.value = ''
}

const setBodyScroll = lock => {
  const b = document?.body
  if (!b) return
  if (lock) b.classList.add('no-scroll')
  else b.classList.remove('no-scroll')
}

watch(
  () => props.show,
  v => setBodyScroll(!!v),
  { immediate: true }
)

onUnmounted(() => setBodyScroll(false))
</script>

<template>
  <transition name="fade">
    <Teleport to="body">
      <form v-if="show" class="modal-overlay" @click.self="handleCancel" @submit.prevent="handleAccept">
        <div class="modal-container">
          <img src="@/assets/images/logo-fin-control.png" alt="Logo" class="modal-logo" />

          <h2 class="modal-title">{{ isLogin ? t('auth.login.title') : t('auth.logout') }}</h2>

          <template v-if="isLogin">
            <FcFormField
              v-model="email"
              :label="t('auth.login.email')"
              type="email"
              :placeholder="t('auth.login.email-placeholder')"
              autocomplete="email"
              required
              :error-message="t('validation.email-invalid')"
            />

            <FcFormField
              v-model="password"
              :label="t('auth.login.password')"
              type="password"
              :placeholder="t('auth.login.password-placeholder')"
              autocomplete="current-password"
              required
              :error-message="t('validation.password-required')"
            />
          </template>

          <template v-else>
            <p class="modal-message">{{ t('auth.logoutConfirm') }}</p>
          </template>

          <div class="modal-actions">
            <button class="button" type="button" @click="handleAccept">
              {{ isLogin ? t('auth.login.submit') : t('auth.logout') }}
            </button>
            <button class="button button-secondary" type="button" @click="handleCancel">{{ t('common.cancel') }}</button>
          </div>
        </div>
      </form>
    </Teleport>
  </transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-50);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: none;
}

.modal-container {
  background-color: var(--primary-color);
  padding: 2rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px var(--shadow-elev-4);
}

.modal-logo {
  display: block;
  margin: 0 auto 1rem auto;
  width: 128px;
}

.modal-title {
  text-align: center;
  color: var(--accent-color);
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
}

.modal-message {
  text-align: center;
  color: var(--text-color);
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

.no-scroll {
  overflow: hidden !important;
}
</style>
