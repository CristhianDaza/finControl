<script setup>
import { ref, defineAsyncComponent, computed } from 'vue'
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  show: Boolean,
  mode: {
    type: String,
    default: 'login',
  },
})

const emit = defineEmits(['accept-button', 'cancel-button'])

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const isLogin = computed(() => props.mode === 'login')

const handleAccept = () => {
  emit('accept-button', {
    email: email.value,
    password: password.value,
  })
}

const handleCancel = () => {
  emit('cancel-button')
  email.value = ''
  password.value = ''
}
</script>

<template>
  <transition name="fade">
    <Teleport to="body">
      <form v-if="show" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-container">
        <img src="@/assets/images/logo-fin-control.png" alt="Logo" class="modal-logo" />

        <h2 class="modal-title">{{ isLogin ? 'Iniciar Sesión' : 'Cerrar Sesión' }}</h2>

        <template v-if="isLogin">
          <FcFormField
            v-model="email"
            label="Correo electrónico"
            type="email"
            placeholder="ejemplo@correo.com"
            autocomplete="email"
            required
            error-message="Correo válido requerido"
          />

          <FcFormField
            v-model="password"
            label="Contraseña"
            type="password"
            placeholder="Tu contraseña"
            autocomplete="current-password"
            required
            error-message="Ingresa tu contraseña"
          />
        </template>

        <template v-else>
          <p class="modal-message">¿Estás seguro que deseas cerrar sesión?</p>
        </template>

        <div class="modal-actions">
          <button class="button" @click="handleAccept">
            {{ isLogin ? 'Iniciar Sesión' : 'Cerrar Sesión' }}
          </button>
          <button class="button button-outline" @click="handleCancel">Cancelar</button>
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-container {
  background-color: var(--primary-color);
  padding: 2rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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

.button {
  background-color: var(--accent-color);
  color: var(--background-color);
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.button-outline {
  background-color: transparent;
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}
</style>
