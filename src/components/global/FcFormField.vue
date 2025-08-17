<script setup>
import { ref, computed, useAttrs, nextTick } from 'vue'
import { useFormattedNumber } from '@/composables/useFormattedNumber.js'
import { t } from '@/i18n/index.js'

const props = defineProps({
  modelValue: [String, Number, Array],
  type: { type: String, default: 'text' },
  label: String,
  name: String,
  id: String,
  placeholder: String,
  options: { type: Array, default: () => [] },
  formatThousands: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const attrs = useAttrs()
const model = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isFormattedNumber = computed(() => props.type === 'number' && props.formatThousands)
const displayValue = isFormattedNumber.value ? useFormattedNumber(model) : model

const touched = ref(false)

const isValid = computed(() => {
  const el = document.getElementById(props.id)
  return el ? el.checkValidity() : true
})

const isPassword = computed(() => props.type === 'password')
const showPassword = ref(false)

const currentInputType = computed(() => {
  if (isPassword.value && showPassword.value) return 'text'
  return props.type
})

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const numberInputRef = ref(null)
const desiredDigitsLeftAfter = ref(null)

const countDigitsLeft = (str, pos) => {
  let c = 0
  for (let i = 0; i < Math.max(0, pos); i++) if (/[0-9]/.test(str[i])) c++
  return c
}
const findPosByDigits = (str, digitsLeft) => {
  if (digitsLeft == null) return null
  if (digitsLeft <= 0) return 0
  let c = 0
  for (let i = 0; i < str.length; i++) {
    if (/[0-9]/.test(str[i])) {
      c++
      if (c === digitsLeft) return i + 1
    }
  }
  return str.length
}

const handleKeyDown = (e) => {
  if (!isFormattedNumber.value) return
  const el = e.target
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? start
  const value = el.value || ''
  const digitsLeft = countDigitsLeft(value, start)
  const key = e.key
  const isDigit = /^[0-9]$/.test(key)
  const isBackspace = key === 'Backspace'
  const isDelete = key === 'Delete'
  const isDecimal = key === '.' || key === ','

  let desired = digitsLeft

  if (isDigit) {
    desired = countDigitsLeft(value, start) + 1
  } else if (isBackspace) {
    if (start !== end) {
      desired = countDigitsLeft(value, start)
    } else {
      const leftChar = value[start - 1]
      desired = digitsLeft - (/[0-9]/.test(leftChar) ? 1 : 0)
    }
  } else if (isDelete) {
    desired = digitsLeft
  } else if (isDecimal) {
    desired = digitsLeft
  } else if (key && key.length > 1) {
    // Teclas especiales (flechas, Home/End, Tab, etc.): no forzar caret
    desired = null
  } else {
    // Otros caracteres no numéricos: no forzar caret
    desired = null
  }

  desiredDigitsLeftAfter.value = desired != null ? Math.max(0, desired) : null
}
const handleInput = () => {
  if (!isFormattedNumber.value) return
  const desired = desiredDigitsLeftAfter.value
  if (desired == null) return
  nextTick(() => {
    const el = numberInputRef.value
    if (!el) return
    const pos = findPosByDigits(el.value, desired)
    if (pos != null) el.setSelectionRange(pos, pos)
  })
}
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="id">{{ label }}</label>
    <slot name="label" />
    <div v-if="!['textarea', 'select', 'number'].includes(type)" class="input-wrapper">
      <input
        :type="currentInputType"
        :id="id"
        :placeholder="placeholder"
        v-model="model"
        v-bind="attrs"
        @blur="touched = true"
        :class="{ invalid: touched && !isValid }"
      />
      <button
        v-if="isPassword && attrs['show-toggle'] !== false"
        type="button"
        class="toggle-password"
        @click="togglePassword"
        :title="showPassword ? t('auth.hide-password') : t('auth.show-password')"
      >
        {{ showPassword ? '🙈' : '👁️' }}
      </button>
    </div>


    <input
      v-if="type === 'number'"
      ref="numberInputRef"
      type="text"
      :id="id"
      :name="name"
      :placeholder="placeholder"
      v-model="displayValue"
      v-bind="attrs"
      inputmode="decimal"
      autocomplete="off"
      @keydown="handleKeyDown"
      @input="handleInput"
      @blur="touched = true"
      :class="{ invalid: touched && !isValid }"
    />

    <textarea
      v-if="type === 'textarea'"
      :id="id"
      :placeholder="placeholder"
      v-model="model"
      v-bind="attrs"
      @blur="touched = true"
      :class="{ invalid: touched && !isValid }"
    ></textarea>

    <select
      v-if="type === 'select'"
      :id="id"
      :name="name"
      v-model="model"
      v-bind="attrs"
      @blur="touched = true"
      :class="{ invalid: touched && !isValid }"
    >
      <option v-if="!attrs.multiple" disabled value="">-- {{ t('common.select-option') }} --</option>
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <p v-if="touched && !isValid && (errorMessage || t('validation.invalid-field'))" class="error-message">
      {{ errorMessage || t('validation.invalid-field') }}
    </p>
  </div>
</template>

<style scoped>
.form-field { margin-bottom: .75rem }
.input-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--muted-text-color);
  cursor: pointer;
  font-size: 1rem;
}

</style>
