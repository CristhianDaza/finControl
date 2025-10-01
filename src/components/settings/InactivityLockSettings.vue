<script setup>
import { ref, computed, watch } from 'vue'
import { useInactivityLockStore } from '@/stores/inactivityLock.js'
import { useAuthStore } from '@/stores/auth.js'
import { hashPin, verifyPin } from '@/utils/crypto.js'
import { t } from '@/i18n/index.js'

const store = useInactivityLockStore()
const authStore = useAuthStore()
const showPinSetup = ref(false)
const showRemoveConfirm = ref(false)
const isProcessing = ref(false)
const hasError = ref(false)
const errorMessage = ref('')

const currentPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const currentPinValid = ref(false)

const selectedTimeout = ref(store.timeoutMinutes)

const timeoutOptions = [
  { value: 0, label: t('inactivityLock.timeouts.disabled') },
  { value: 1, label: t('inactivityLock.timeouts.1min') },
  { value: 5, label: t('inactivityLock.timeouts.5min') },
  { value: 10, label: t('inactivityLock.timeouts.10min') },
  { value: 30, label: t('inactivityLock.timeouts.30min') }
]

const statusText = computed(() => {
  if (!store.isConfigured) return t('inactivityLock.status.notConfigured')
  if (store.timeoutMinutes === 0) return t('inactivityLock.status.configured')
  return t('inactivityLock.status.active', { minutes: store.timeoutMinutes })
})

const statusClass = computed(() => {
  if (!store.isConfigured) return 'status-inactive'
  if (store.timeoutMinutes === 0) return 'status-disabled'
  return 'status-active'
})

const canSubmit = computed(() => {
  if (isProcessing.value) return false

  if (!store.isConfigured) {
    return currentPin.value.length >= 4 &&
        newPin.value.length >= 4 &&
        currentPin.value === newPin.value
  } else {
    if (!currentPinValid.value) {
      return currentPin.value.length >= 4
    }
    return newPin.value.length >= 4 &&
        confirmPin.value.length >= 4 &&
        newPin.value === confirmPin.value
  }
})

watch(currentPin, async (newVal) => {
  if (store.isConfigured && newVal.length >= 4) {
    try {
      currentPinValid.value = await verifyPin(newVal, store.pinHash)
      if (currentPinValid.value) {
        hasError.value = false
        errorMessage.value = ''
      }
    } catch (error) {
      currentPinValid.value = false
    }
  } else {
    currentPinValid.value = false
  }
})

watch(() => store.timeoutMinutes, (newValue) => {
  selectedTimeout.value = newValue
})

function toggleLock(event) {
  if (event.target.checked && !store.isConfigured) {
    showPinSetup.value = true
  } else if (!event.target.checked && store.isConfigured) {
    showRemoveConfirm.value = true
  }
}

async function handlePinSubmit() {
  hasError.value = false
  errorMessage.value = ''
  isProcessing.value = true

  try {
    if (!store.isConfigured) {
      if (currentPin.value !== newPin.value) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinsNoMatch')
        return
      }

      if (currentPin.value.length < 4 || currentPin.value.length > 8) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinLength')
        return
      }

      if (!/^\d+$/.test(currentPin.value)) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinNumeric')
        return
      }

      const hash = await hashPin(currentPin.value)
      store.setPin(hash)
      store.setTimeoutMinutes(5)

      showPinSetup.value = false
      resetForm()
    } else {
      if (!currentPinValid.value) {
        const isValid = await verifyPin(currentPin.value, store.pinHash)
        if (!isValid) {
          hasError.value = true
          errorMessage.value = t('inactivityLock.errors.incorrectPin')
          return
        }
        currentPinValid.value = true
        return
      }

      if (newPin.value !== confirmPin.value) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinsNoMatch')
        return
      }

      if (newPin.value.length < 4 || newPin.value.length > 8) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinLength')
        return
      }

      if (!/^\d+$/.test(newPin.value)) {
        hasError.value = true
        errorMessage.value = t('inactivityLock.errors.pinNumeric')
        return
      }

      const hash = await hashPin(newPin.value)
      store.setPin(hash)

      showPinSetup.value = false
      resetForm()
    }
  } catch (error) {
    hasError.value = true
    errorMessage.value = t('inactivityLock.errors.processing')
  } finally {
    isProcessing.value = false
  }
}

function cancelPinSetup() {
  showPinSetup.value = false
  resetForm()
}

function resetForm() {
  currentPin.value = ''
  newPin.value = ''
  confirmPin.value = ''
  currentPinValid.value = false
  hasError.value = false
  errorMessage.value = ''
}

function updateTimeout(minutes) {
  store.setTimeoutMinutes(minutes)
  // Restart tracking is handled in App.vue through watch
}

function removePinConfirmed() {
  store.clearPin()
  showRemoveConfirm.value = false
}
</script>

<template>
  <section class="inactivity-lock-section">
    <div class="section-header">
      <h2 class="section-title">{{ t('inactivityLock.title') }}</h2>
    </div>

    <p class="section-description">{{ t('inactivityLock.description') }}</p>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          :checked="store.isConfigured"
          @change="toggleLock"
          :disabled="isProcessing"
        >
        {{ t('inactivityLock.enable') }}
      </label>
    </div>

    <div v-if="showPinSetup" class="pin-setup">
      <h4>{{ store.isConfigured ? t('inactivityLock.changePin') : t('inactivityLock.setupPin') }}</h4>

      <form @submit.prevent="handlePinSubmit" class="pin-form">
        <div class="form-field">
          <label class="field-label" for="new-pin">
            {{ store.isConfigured ? t('inactivityLock.currentPin') : t('inactivityLock.newPin') }}
          </label>
          <input
            id="new-pin"
            v-model="currentPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="8"
            minlength="4"
            class="input pin-input"
            :class="{ 'pin-input-error': hasError }"
            :placeholder="t('inactivityLock.placeholder')"
            autocomplete="off"
            :disabled="isProcessing"
          >
        </div>

        <div v-if="!store.isConfigured || (store.isConfigured && currentPinValid)" class="form-field">
          <label class="field-label" for="confirm-pin">
            {{ store.isConfigured ? t('inactivityLock.newPin') : t('inactivityLock.confirmPin') }}
          </label>
          <input
            id="confirm-pin"
            v-model="newPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="8"
            minlength="4"
            class="input pin-input"
            :class="{ 'pin-input-error': hasError }"
            :placeholder="t('inactivityLock.placeholder')"
            autocomplete="off"
            :disabled="isProcessing"
          >
        </div>

        <div v-if="store.isConfigured && currentPinValid" class="form-field">
          <label class="field-label" for="confirm-new-pin">{{ t('inactivityLock.confirmNewPin') }}</label>
          <input
            id="confirm-new-pin"
            v-model="confirmPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="8"
            minlength="4"
            class="input pin-input"
            :class="{ 'pin-input-error': hasError }"
            :placeholder="t('inactivityLock.placeholder')"
            autocomplete="off"
            :disabled="isProcessing"
          >
        </div>

        <div v-if="hasError" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="button button-primary"
            :disabled="!canSubmit || isProcessing"
            :aria-busy="isProcessing"
          >
            {{ isProcessing ? t('inactivityLock.saving') : t('inactivityLock.savePin') }}
          </button>

          <button
            type="button"
            class="button button-secondary"
            @click="cancelPinSetup"
            :disabled="isProcessing"
          >
            {{ t('inactivityLock.cancel') }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="store.isConfigured && !showPinSetup" class="timeout-settings">
      <h4 class="subsection-title">{{ t('inactivityLock.timeoutTitle') }}</h4>
      <div class="timeout-select-container">
        <select
          v-model="selectedTimeout"
          @change="updateTimeout(selectedTimeout)"
          class="timeout-select"
        >
          <option
            v-for="option in timeoutOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="store.isConfigured && !showPinSetup" class="status-info">
      <div class="status-item">
        <strong>{{ t('inactivityLock.status.label') }}</strong>
        <span :class="statusClass">{{ statusText }}</span>
      </div>

      <div class="pin-actions">
        <button @click="showPinSetup = true" class="button button-secondary">
          {{ t('inactivityLock.changeButton') }}
        </button>

        <button @click="showRemoveConfirm = true" class="button button-danger">
          {{ t('inactivityLock.removeButton') }}
        </button>
      </div>
    </div>

    <div v-if="showRemoveConfirm" class="confirm-overlay">
      <div class="confirm-modal">
        <h4>{{ t('inactivityLock.removeConfirm.title') }}</h4>
        <p>{{ t('inactivityLock.removeConfirm.message') }}</p>
        <div class="confirm-actions">
          <button @click="removePinConfirmed" class="button button-danger">
            {{ t('inactivityLock.removeConfirm.confirm') }}
          </button>
          <button @click="showRemoveConfirm = false" class="button button-secondary">
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.inactivity-lock-section {
  display: grid;
  gap: 1rem;
  width: 100%;
}

.section-header {
  margin-bottom: 0;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-description {
  color: var(--muted-text-color);
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.setting-group {
  margin-bottom: 1rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-color);
  font-weight: 500;
}

.setting-label input[type="checkbox"] {
  margin: 0;
}

.pin-setup {
  background: var(--secondary-color);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  border: 1px dashed var(--primary-color);
}

.pin-setup h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.pin-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.input {
  padding: 0.75rem;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--background-color);
  color: var(--text-color);
  text-align: center;
  letter-spacing: 0.1em;
  transition: all 0.2s ease;
}

.pin-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}

.pin-input-error {
  border-color: var(--error-color);
}

.error-message {
  color: var(--error-color);
  font-size: 0.85rem;
  margin: 0;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.button {
  flex: 1;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.button-primary {
  background: var(--accent-color);
  color: var(--white);
}

.button-primary:hover:not(:disabled) {
  background: var(--hover-accent-color);
  transform: translateY(-1px);
}

.button-secondary {
  background: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
}

.button-secondary:hover:not(:disabled) {
  background: var(--hover-secondary-color);
}

.button-danger {
  background: var(--error-color);
  color: var(--white);
}

.button-danger:hover:not(:disabled) {
  background: var(--hover-error-color);
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.timeout-settings {
  margin: 1rem 0;
}

.subsection-title {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 0.95rem;
  font-weight: 600;
}

.timeout-select-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeout-select {
  padding: 0.75rem;
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--background-color);
  color: var(--text-color);
  transition: all 0.2s ease;
}

.timeout-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}

.status-info {
  background: var(--secondary-color);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid var(--primary-color);
}

.status-item {
  margin-bottom: 1rem;
  color: var(--text-color);
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.status-active {
  color: var(--success-color);
  font-weight: 500;
}

.status-disabled {
  color: var(--warning-color);
  font-weight: 500;
}

.status-inactive {
  color: var(--muted-text-color);
}

.pin-actions {
  display: flex;
  gap: 0.5rem;
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.confirm-modal {
  background: var(--background-color);
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 350px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--primary-color);
}

.confirm-modal h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.confirm-modal p {
  margin: 0 0 1.5rem 0;
  color: var(--muted-text-color);
  font-size: 0.9rem;
  line-height: 1.4;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .form-actions,
  .pin-actions,
  .confirm-actions {
    flex-direction: column;
  }

  .timeout-options {
    gap: 0.75rem;
  }

  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
