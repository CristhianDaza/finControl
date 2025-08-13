<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')

const emailError = computed(() => {
  if (!email.value) return null
  const ok = /.+@.+\..+/.test(email.value)
  return ok ? null : 'Ingresa un correo válido'
})

const passwordError = computed(() => {
  if (!password.value) return null
  return password.value.length > 0 ? null : 'La contraseña es requerida'
})

const submit = async () => {
  if (emailError.value || passwordError.value) return
  const ok = await auth.login(email.value.trim(), password.value)
  if (ok) {
    const redirect = (route.query.redirect || '/')
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      router.push(redirect)
    } else {
      router.push({ name: 'home' })
    }
  }
}
</script>

<template>
  <section class="login-container">
    <div class="card login-card" role="dialog" aria-labelledby="login-title" aria-describedby="login-desc">
      <h1 id="login-title">Iniciar sesión</h1>
      <p id="login-desc" class="muted">Accede con tu correo y contraseña.</p>

      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span>Correo electrónico</span>
          <input
            class="input"
            type="email"
            v-model="email"
            name="email"
            autocomplete="email"
            required
            aria-required="true"
            :aria-invalid="!!emailError"
            aria-describedby="email-help"
            placeholder="ejemplo@correo.com"
          />
          <small id="email-help" v-if="emailError" class="error">{{ emailError }}</small>
        </label>

        <label class="field">
          <span>Contraseña</span>
          <input
            class="input"
            type="password"
            v-model="password"
            name="password"
            autocomplete="current-password"
            required
            aria-required="true"
            :aria-invalid="!!passwordError"
            aria-describedby="password-help"
            placeholder="Tu contraseña"
          />
          <small id="password-help" v-if="passwordError" class="error">{{ passwordError }}</small>
        </label>

        <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>

        <button class="button w-full" :disabled="auth.status === 'loading'">
          {{ auth.status === 'loading' ? 'Ingresando…' : 'Iniciar sesión' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-container {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1rem;
}
.login-card {
  width: 100%;
  max-width: 380px;
}
.field {
  display: block;
  margin-bottom: 1rem;
}
.field span {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--hover-text-color);
}
.input {
  width: 100%;
}
.error {
  color: var(--error-color);
  margin-top: 0.25rem;
}
.muted {
  color: var(--muted-text-color);
  margin-top: -0.25rem;
  margin-bottom: 1rem;
}
.w-full { width: 100%; }
</style>

