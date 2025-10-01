<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useInactivityLockStore } from '@/stores/inactivityLock.js'
import { useAuthStore } from '@/stores/auth.js'
import { verifyPin } from '@/utils/crypto.js'
import { t } from '@/i18n/index.js'

const store = useInactivityLockStore()
const authStore = useAuthStore()
const pinInput = ref(null)
const enteredPin = ref('')
const hasError = ref(false)
const errorMessage = ref('')
const showForgotPin = ref(false)
const lockoutTimer = ref(null)

const lockTitleId = 'inactivity-lock-title'

const isInLockout = computed(() => store.isInLockout())
const lockoutRemaining = computed(() => store.getLockoutRemaining())

let focusableElements = []
let firstFocusableElement = null
let lastFocusableElement = null

function updateLockoutTimer() {
  if (isInLockout.value) {
    lockoutTimer.value = setInterval(() => {
      if (!store.isInLockout()) {
        clearInterval(lockoutTimer.value)
        lockoutTimer.value = null
      }
    }, 1000)
  }
}

async function handleSubmit() {
  if (isInLockout.value || !enteredPin.value) return

  hasError.value = false
  errorMessage.value = ''

  try {
    const isValid = await verifyPin(enteredPin.value, store.pinHash)

    if (isValid) {
      store.unlock()
      enteredPin.value = ''
    } else {
      store.recordFailedAttempt()
      hasError.value = true

      const remaining = 3 - store.failedAttempts
      if (remaining > 0) {
        errorMessage.value = t('inactivityLock.modal.incorrectPin', { remaining })
      }

      enteredPin.value = ''

      if (store.failedAttempts >= 3) {
        updateLockoutTimer()
        setTimeout(async () => {
          await resetPinAndLogout()
        }, 1000)
        return
      }

      await nextTick()
      pinInput.value?.focus()
    }
  } catch (error) {
    hasError.value = true
    errorMessage.value = t('inactivityLock.modal.error')
    enteredPin.value = ''
  }
}

async function resetPinAndLogout() {
  store.clearPin()
  showForgotPin.value = false
  await authStore.logout()
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    return
  }

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement?.focus()
      }
    } else {
      if (document.activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement?.focus()
      }
    }
  }
}

function setupFocusTrap() {
  const modal = document.querySelector('.inactivity-lock-modal')
  if (!modal) return

  focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  firstFocusableElement = focusableElements[0]
  lastFocusableElement = focusableElements[focusableElements.length - 1]

  nextTick(() => {
    pinInput.value?.focus()
  })
}

onMounted(() => {
  if (store.isLocked) {
    setupFocusTrap()
    updateLockoutTimer()
  }
})

onUnmounted(() => {
  if (lockoutTimer.value) {
    clearInterval(lockoutTimer.value)
  }
})
</script>

<template>
  <div
    v-if="store.isLocked"
    class="inactivity-lock-modal"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="lockTitleId"
    @keydown="handleKeydown"
  >
    <div class="lock-content">
      <div class="lock-header">
        <h2 :id="lockTitleId">{{ t('inactivityLock.modal.title') }}</h2>
        <p>{{ t('inactivityLock.modal.description') }}</p>
      </div>

      <form @submit.prevent="handleSubmit" class="lock-form">
        <div class="pin-input-container">
          <input
            ref="pinInput"
            v-model="enteredPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="8"
            minlength="4"
            class="pin-input"
            :class="{ 'error': hasError }"
            :disabled="isInLockout"
            :aria-label="t('inactivityLock.modal.placeholder')"
            :placeholder="t('inactivityLock.modal.placeholder')"
            autocomplete="off"
          >
        </div>

        <div v-if="hasError" class="error-message" role="alert">
          {{ errorMessage }}
        </div>

        <div v-if="isInLockout" class="lockout-message" role="alert">
          {{ t('inactivityLock.modal.lockout', { seconds: lockoutRemaining }) }}
        </div>

        <div class="lock-actions">
          <button
            type="submit"
            class="unlock-btn"
            :disabled="!enteredPin || enteredPin.length < 4 || isInLockout"
          >
            {{ t('inactivityLock.modal.unlock') }}
          </button>

          <button
            type="button"
            class="forgot-pin-btn"
            @click="showForgotPin = true"
            :disabled="isInLockout"
          >
            {{ t('inactivityLock.modal.forgotPin') }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="showForgotPin" class="forgot-pin-overlay">
      <div class="forgot-pin-modal">
        <h3>{{ t('inactivityLock.modal.forgotConfirm.title') }}</h3>
        <p>{{ t('inactivityLock.modal.forgotConfirm.message') }}</p>
        <div class="forgot-pin-actions">
          <button @click="resetPinAndLogout" class="reset-btn">
            {{ t('inactivityLock.modal.forgotConfirm.confirm') }}
          </button>
          <button @click="showForgotPin = false" class="cancel-btn">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inactivity-lock-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.lock-content {
  background: var(--background-color, #fff);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--primary-color, #ccc);
}

.lock-header {
  text-align: center;
  margin-bottom: 2rem;
}

.lock-header h2 {
  color: var(--text-color, #333);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.lock-header p {
  color: var(--text-color, #666);
  margin: 0;
  opacity: 0.8;
}

.lock-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pin-input-container {
  position: relative;
}

.pin-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  text-align: center;
  border: 2px solid var(--primary-color, #ccc);
  border-radius: 8px;
  background: var(--background-color, #fff);
  color: var(--text-color, #333);
  letter-spacing: 0.2em;
}

.pin-input:focus {
  outline: none;
  border-color: var(--accent-color, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.pin-input.error {
  border-color: var(--tx-expense-color, #dc3545);
}

.error-message {
  color: var(--tx-expense-color, #dc3545);
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}

.lockout-message {
  color: var(--tx-expense-color, #dc3545);
  font-size: 0.9rem;
  text-align: center;
  font-weight: 600;
}

.lock-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.unlock-btn {
  padding: 1rem;
  background: var(--accent-color, #007bff);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover:not(:disabled) {
  background: var(--primary-color, #0056b3);
  transform: translateY(-1px);
}

.unlock-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.forgot-pin-btn {
  padding: 0.5rem;
  background: transparent;
  color: var(--text-color, #666);
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.8;
}

.forgot-pin-btn:hover:not(:disabled) {
  opacity: 1;
}

.forgot-pin-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.forgot-pin-modal {
  background: var(--background-color, #fff);
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 300px;
  text-align: center;
}

.forgot-pin-modal h3 {
  color: var(--text-color, #333);
  margin: 0 0 1rem 0;
}

.forgot-pin-modal p {
  color: var(--text-color, #666);
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
}

.forgot-pin-actions {
  display: flex;
  gap: 0.5rem;
}

.reset-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--tx-expense-color, #dc3545);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.cancel-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--primary-color, #6c757d);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

@media (max-width: 480px) {
  .lock-content {
    margin: 1rem;
    padding: 1.5rem;
  }
}
</style>
