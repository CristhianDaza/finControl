<script setup>
import { ref, computed, useAttrs } from 'vue'
import { useFormattedNumber } from '@/composables/useFormattedNumber.js'

const props = defineProps({
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  label: String,
  name: String,
  id: String,
  placeholder: String,
  options: { type: Array, default: () => [] },
  formatThousands: { type: Boolean, default: false },
  errorMessage: { type: String, default: 'Campo inválido' }
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
        :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      >
        {{ showPassword ? '🙈' : '👁️' }}
      </button>
    </div>


    <input
      v-if="type === 'number'"
      type="text"
      :id="id"
      :name="name"
      :placeholder="placeholder"
      v-model="displayValue"
      v-bind="attrs"
      inputmode="decimal"
      autocomplete="off"
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
      <option disabled value="">-- Selecciona una opción --</option>
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <p v-if="touched && !isValid && errorMessage" class="error-message">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
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
