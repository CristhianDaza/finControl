<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { t } from '@/i18n/index.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref('login')
const isSignup = computed(() => mode.value === 'signup')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')

const emailError = computed(() => { if (!email.value) return null; return /.+@.+\..+/.test(email.value) ? null : t('validation.email-invalid') })
const passwordError = computed(() => { if (!password.value) return null; return password.value.length > 0 ? null : t('validation.password-required') })
const confirmPasswordError = computed(() => { if (!isSignup.value) return null; if (!confirmPassword.value) return null; return confirmPassword.value === password.value ? null : t('errors.signup.password_mismatch') })
const codeError = computed(() => { if (!isSignup.value) return null; if (!code.value) return t('validation.code-required'); return null })

const submit = async () => {
  if (emailError.value || passwordError.value) return
  if (isSignup.value && (confirmPasswordError.value || codeError.value)) return
  if (isSignup.value) {
    const ok = await auth.signup(email.value.trim(), password.value, code.value.trim(), confirmPassword.value)
    if (ok) {
      const redirect = (route.query.redirect || '/')
      if (typeof redirect === 'string' && redirect.startsWith('/')) await router.push(redirect)
      else await router.push({ name: 'home' })
    }
  } else {
    const ok = await auth.login(email.value.trim(), password.value)
    if (ok) {
      const redirect = (route.query.redirect || '/')
      if (typeof redirect === 'string' && redirect.startsWith('/')) await router.push(redirect)
      else await router.push({ name: 'home' })
    }
  }
}
const toggle = () => { mode.value = isSignup.value ? 'login' : 'signup'; auth.error = null }
</script>

<template>
  <section class="login-container">
    <div class="card login-card" role="dialog" aria-labelledby="login-title" aria-describedby="login-desc">
      <img src="@/assets/images/logo-fin-control.png" alt="Logo" class="login-logo" />
      <h1 id="login-title">{{ isSignup ? t('auth.signup.title') : t('auth.login.title') }}</h1>
      <p id="login-desc" class="muted">{{ isSignup ? t('auth.signup.description') : t('auth.login.description') }}</p>
      <form @submit.prevent="submit" novalidate>
        <label class="field">
          <span>{{ isSignup ? t('auth.signup.email') : t('auth.login.email') }}</span>
          <input class="input" type="email" v-model="email" autocomplete="email" required :aria-invalid="!!emailError" aria-describedby="email-help" :placeholder="t('auth.login.email-placeholder')" />
          <small id="email-help" v-if="emailError" class="error">{{ emailError }}</small>
        </label>
        <label class="field">
          <span>{{ isSignup ? t('auth.signup.password') : t('auth.login.password') }}</span>
          <input class="input" type="password" v-model="password" :autocomplete="isSignup ? 'new-password' : 'current-password'" required :aria-invalid="!!passwordError" aria-describedby="password-help" :placeholder="t('auth.login.password-placeholder')" />
          <small id="password-help" v-if="passwordError" class="error">{{ passwordError }}</small>
        </label>
        <label v-if="isSignup" class="field">
          <span>{{ t('auth.signup.confirmPassword') }}</span>
          <input class="input" type="password" v-model="confirmPassword" autocomplete="new-password" required :aria-invalid="!!confirmPasswordError" aria-describedby="confirm-help" />
          <small id="confirm-help" v-if="confirmPasswordError" class="error">{{ confirmPasswordError }}</small>
        </label>
        <label v-if="isSignup" class="field">
          <span>{{ t('auth.signup.code') }}</span>
          <input class="input" type="text" v-model="code" autocomplete="off" required :aria-invalid="!!codeError" aria-describedby="code-help" :placeholder="t('auth.signup.code-placeholder')" />
          <small id="code-help" v-if="codeError" class="error">{{ codeError }}</small>
        </label>
        <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>
        <button class="button w-full" :disabled="auth.status === 'loading'">
          {{ auth.status === 'loading' ? (isSignup ? t('auth.signup.submitting') : t('auth.login.submitting')) : (isSignup ? t('auth.signup.submit') : t('auth.login.submit')) }}
        </button>
      </form>
      <button class="link-toggle" type="button" @click="toggle">{{ isSignup ? t('auth.signup.toggleLogin') : t('auth.signup.toggleSignup') }}</button>
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
.login-logo {
  display: block;
  margin: 0 auto 1rem auto;
  width: 128px;
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
