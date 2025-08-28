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
  <section class="login-wrapper">
    <div class="card login-card" role="dialog" aria-labelledby="login-title" aria-describedby="login-desc">
      <div class="login-inner">
        <img src="@/assets/images/logo-fin-control.png" alt="Logo" class="login-logo" />
        <h1 id="login-title">{{ isSignup ? t('auth.signup.title') : t('auth.login.title') }}</h1>
        <p id="login-desc" class="muted">{{ isSignup ? t('auth.signup.description') : t('auth.login.description') }}</p>
        <form @submit.prevent="submit" novalidate class="login-form">
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
          <button class="button btn-primary full-width" :disabled="auth.status === 'loading'" :aria-disabled="auth.status==='loading'">
            {{ auth.status === 'loading' ? (isSignup ? t('auth.signup.submitting') : t('auth.login.submitting')) : (isSignup ? t('auth.signup.submit') : t('auth.login.submit')) }}
          </button>
          <button class="button button-secondary toggle-btn" type="button" @click="toggle">{{ isSignup ? t('auth.signup.toggleLogin') : t('auth.signup.toggleSignup') }}</button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-card { display:flex; flex:1 1 auto; }
.login-inner { margin:0 auto; min-height:100%; max-height:100%; overflow-y:auto; overscroll-behavior:contain; }
@media (max-width:600px) { .login-inner { padding:1.25rem 1.1rem 2rem; border-radius:0; margin:0 auto; } }
.login-wrapper {
  min-height:100vh;
  min-height:100dvh;
  min-height:100svh;
  width:100%;
  margin:0;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent-color) 25%, transparent) 0%, transparent 60%),
    radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--info-color) 25%, transparent) 0%, transparent 65%),
    linear-gradient(160deg, var(--background-color), color-mix(in srgb, var(--background-color) 85%, var(--primary-color)) 70%);
  background-attachment: fixed;
  overflow-x:hidden;
  overflow-y:auto;
  -webkit-overflow-scrolling: touch;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
@media (max-width:600px){ .login-wrapper { display:flex; align-items:stretch; } }
@supports (-webkit-touch-callout: none) { .login-wrapper { background-attachment: scroll; } }

.login-card {
  max-width:none;
  width:100%;
  border-radius:0;
  box-shadow:none;
  backdrop-filter:none;
  -webkit-backdrop-filter:none;
  background:transparent;
  border:0;
}
@media (max-width:600px){ .login-card { min-height:auto; width:100%; flex:1; } }
.login-card::before, .login-card::after {
  display:none;
}
.login-inner {
  width:100%;
  max-width:520px;
  margin:clamp(1rem, 4vh, 3rem) auto;
  padding:clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 3vw, 2.75rem);
  display:flex;
  flex-direction:column;
  gap:.9rem;
  background: linear-gradient(165deg, color-mix(in srgb, var(--primary-color) 85%, transparent), color-mix(in srgb, var(--secondary-color) 95%, transparent) 70%);
  border:1px solid color-mix(in srgb, var(--primary-color) 70%, var(--accent-color));
  border-radius:24px;
  box-shadow:0 4px 22px -4px var(--shadow-elev-3), 0 0 0 1px color-mix(in srgb, var(--accent-color) 20%, transparent);
  box-sizing:border-box;
}

.login-logo { display:block; margin:0 auto .75rem; width:128px; filter: drop-shadow(0 4px 8px var(--shadow-soft)); }

.login-card h1 {
  margin:0;
  font-size:clamp(1.55rem, 1.9vw, 1.9rem);
  text-align:center;
  letter-spacing:.5px;
  background: linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, var(--info-color)));
  background-clip:text;
  -webkit-background-clip:text;
  color:transparent;
}
.muted {
  color: var(--muted-text-color);
  margin-top:-.25rem;
  margin-bottom:.75rem;
  text-align:center;
  font-size:.9rem;
  line-height:1.3;
}

.field { display:block; margin:0 0 .95rem; }
.field span {
  display:block; margin-bottom:.45rem;
  color: var(--hover-text-color);
  font-size:.78rem; letter-spacing:.5px; text-transform:uppercase; font-weight:600; opacity:.85;
}
.input { width:100%; transition: box-shadow .25s, border-color .25s, background-color .25s; }
.input:hover { background-color: color-mix(in srgb, var(--secondary-color) 92%, var(--accent-color)); }
.input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 55%, transparent); border-color: var(--accent-color); }

.login-form { flex:1 1 auto; display:flex; flex-direction:column; justify-content:flex-start; }
.full-width { width:100%; }

.button.btn-primary {
  position:relative;
  background: linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 80%, var(--info-color)));
  color: var(--background-color);
  font-weight:600; letter-spacing:.4px;
  overflow:hidden;
}
.button.btn-primary::after {
  content:""; position:absolute; inset:0;
  background: linear-gradient(120deg, transparent 10%, rgba(255,255,255,.2) 40%, transparent 70%);
  transform: translateX(-60%);
  transition: transform .7s ease;
}
.button.btn-primary:hover::after { transform: translateX(0); }

.toggle-btn {
  margin-top:.25rem;
  background: var(--secondary-color);
  border:1px solid color-mix(in srgb, var(--primary-color) 70%, var(--accent-color));
  font-size:.85rem;
  display:inline-flex; justify-content:center; align-items:center; gap:.35rem;
}
.toggle-btn:hover { background: color-mix(in srgb, var(--secondary-color) 90%, var(--accent-color)); }

.error { color: var(--error-color); margin-top:.35rem; font-size:.75rem; font-weight:500; }
.button[disabled], .button[aria-disabled='true'] { opacity:.55; cursor:not-allowed; }

@keyframes cardIn {
  from { opacity:0; transform: translateY(14px) scale(.985); }
  to { opacity:1; transform: translateY(0) scale(1); }
}

@media (min-width: 960px) {
  .login-inner { max-width:640px; padding:clamp(2.5rem, 4vw, 4rem) clamp(2rem, 4vw, 3.5rem); }
  .login-form { grid-template-columns:1fr 1fr; display:grid; gap:1rem 1.25rem; }
  .login-form > .field { margin:0; }
  .login-form > .field:nth-of-type(1),
  .login-form > .field:nth-of-type(2) { grid-column: span 1; }
  .login-form > .field:nth-of-type(n+3) { grid-column: span 1; }
  .login-form > .error, .login-form > p.error { grid-column:1 / -1; }
  .login-form > .button { grid-column:1 / -1; }
}
@media (max-width: 600px) {
  .login-inner {
    width:100%;
    max-width:100%;
    padding-block:1.1rem 1.5rem;
    padding-inline:calc(1rem + env(safe-area-inset-left)) calc(1rem + env(safe-area-inset-right));
    border-radius:0;
    margin:0 auto;
    gap:.7rem;
  }
  .login-logo { width:92px; margin-bottom:.5rem; }
  .login-card h1 { font-size:1.32rem; }
  .field { margin-bottom:.65rem; }
}
@media (max-width: 380px) {
  .login-inner {
    padding-block:1.25rem 1.75rem;
    padding-inline:calc(.95rem + env(safe-area-inset-left)) calc(.95rem + env(safe-area-inset-right));
  }
  .login-card h1 { font-size:1.3rem; }
  .toggle-btn { font-size:.75rem; padding:.55rem .9rem; }
}
</style>
