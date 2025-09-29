<script setup>
import { ref, computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()

const planExpiresAtDisplay = computed(() => {
  const exp = auth.profile?.planExpiresAt
  if (!exp) return '—'
  const ms = exp.toMillis ? exp.toMillis() : exp
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString()
  } catch {
    return '—'
  }
})

const showCodeInput = ref(false)
const codeValue = ref('')
const validating = ref(false)
const codeMsg = ref('')
const codeError = ref(false)

const applyCode = async () => {
  if (!codeValue.value || validating.value) return
  validating.value = true
  codeMsg.value = ''
  codeError.value = false
  const res = await auth.applyCodeAndRefresh(codeValue.value)
  validating.value = false
  if (res.ok) {
    codeMsg.value = t('settings.code.success', { date: planExpiresAtDisplay.value })
    codeValue.value = ''
    codeError.value = false
  } else {
    codeMsg.value = res.error || t('errors.generic')
    codeError.value = true
  }
}

const codeInputClass = computed(() => {
  if (codeError.value) return 'code-input-error'
  if (!codeError.value && codeMsg.value && !codeValue.value) return 'code-input-success'
  return ''
})
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.accountStatus') }}
    </h2>
    <div class="flex-col-gap-sm">
      <div>
        <strong>{{ t('settings.accountStatus') }}:</strong>
        {{ auth.isReadOnly ? t('settings.accountStatusInactive') : t('settings.accountStatusActive') }}
      </div>
      <div>
        <strong>{{ t('settings.expiresAt') }}:</strong>
        {{ planExpiresAtDisplay }}
      </div>
      <p class="muted-small">
        {{ auth.isReadOnly ? t('settings.planInstructions.inactive') : t('settings.planInstructions.active') }}
      </p>
      <div class="flex-wrap-gap-sm">
        <button
          class="button"
          type="button"
          @click="showCodeInput = !showCodeInput"
        >
          {{ t('settings.enterCode') }}
        </button>
        <button
          class="button button-secondary"
          type="button"
          :disabled="!auth.canWrite"
          :title="!auth.canWrite ? t('access.readOnly') : ''"
        >
          {{ t('settings.generateCode') }}
        </button>
      </div>
      <div v-if="showCodeInput" class="code-redeem-wrap">
        <div class="form-field code-field">
          <label>
            {{ t('auth.signup.code') }}
          </label>
          <input
            class="input text-uppercase"
            :class="codeInputClass"
            v-model="codeValue"
            :placeholder="t('auth.signup.code-placeholder')"
            :disabled="validating"
            maxlength="24"
          />
          <button
            class="button code-validate-btn"
            type="button"
            @click="applyCode"
            :disabled="!codeValue || validating"
            :aria-busy="validating"
          >
            {{ validating ? t('common.loading') : t('settings.validateCode') }}
          </button>
          <small
            v-if="codeMsg"
            :class="codeError ? 'text-error' : 'text-success'"
          >
            {{ codeMsg }}
          </small>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.flex-col-gap-sm {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.muted-small {
  font-size: .75rem;
  color: var(--muted-text-color);
}

.flex-wrap-gap-sm {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
}

.code-redeem-wrap {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  margin-top: .5rem;
}

.code-field {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.code-field label {
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .5px;
  color: var(--muted-text-color);
}

.code-field .input {
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  padding: .65rem .75rem;
  border-radius: 8px;
  font-size: .95rem;
  letter-spacing: .5px;
  font-weight: 600;
  color: var(--text-color);
}

.code-field .input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}

.code-field .code-validate-btn {
  width: 100%;
  margin-top: .15rem;
}

.code-field small {
  font-size: .65rem;
  line-height: 1.2;
}

.code-input-success {
  border-color: var(--hover-success-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--hover-success-color) 55%, transparent);
}

.code-input-error {
  border-color: var(--error-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--error-color) 55%, transparent);
}

.text-success {
  color: var(--hover-success-color);
}

.text-error {
  color: var(--error-color);
}

.text-uppercase {
  text-transform: uppercase;
}
</style>

