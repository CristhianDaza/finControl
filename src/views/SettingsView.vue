<script setup>
import { onMounted, computed, ref } from 'vue'
import { useSettingsStore, EDITABLE_VARS, THEME_PRESETS } from '@/stores/settings.js'
import { t } from '@/i18n/index.js'
import SettingsIcon from '@/assets/icons/settings.svg?raw'
import { useNotify } from '@/components/global/fcNotify.js'
import { useCurrenciesStore } from '@/stores/currencies.js'
import { useAuthStore } from '@/stores/auth.js'

const settings = useSettingsStore()
const { success: notifySuccess, error: notifyError } = useNotify()
const auth = useAuthStore()

onMounted(() => { settings.initTheme() })

const onInput = (key, e) => { settings.setVar(key, e.target.value) }

const save = async () => { await settings.save(); notifySuccess(t('settings.notifications.saved')) }
const reset = async () => { await settings.reset(); notifySuccess(t('settings.notifications.reset')) }

const lightPresets = computed(() => THEME_PRESETS.filter(p => p.mode === 'light'))
const darkPresets = computed(() => THEME_PRESETS.filter(p => p.mode === 'dark'))
const applyPreset = (id) => { if (!auth.canWrite) return; settings.applyPreset(id) }

const currencies = useCurrenciesStore(); if (currencies.status==='idle') currencies.subscribe()
const newCur = ref({ code:'', symbol:'', name:'', isDefault:false })
const busy = ref(false)
const errorMsg = ref('')
const addCurrency = async () => { if (!auth.canWrite) return; errorMsg.value = ''; if (!newCur.value.code) return; busy.value = true; try { await currencies.create({ ...newCur.value }); notifySuccess(t('settings.currencies.notifications.created')); newCur.value = { code:'', symbol:'', name:'', isDefault:false } } catch (e) { if (/duplicate/i.test(e.message)) errorMsg.value = t('currency.errors.duplicate'); else if (/invalid-code/i.test(e.message)) errorMsg.value = t('currency.errors.invalid'); else errorMsg.value = t('errors.generic'); notifyError(errorMsg.value) } finally { busy.value = false } }
const setDefault = async (id) => { if (!auth.canWrite) return; try { await currencies.setDefault(id); notifySuccess(t('settings.currencies.notifications.defaultChanged')) } catch (e) { notifyError(t('errors.generic')) } }
const removeCurrency = async (id) => { if (!auth.canWrite) return; try { await currencies.remove(id); notifySuccess(t('settings.currencies.notifications.deleted')) } catch (e) { errorMsg.value = t('currency.errors.cannotDeleteDefault'); notifyError(errorMsg.value) } }

const attemptsLeft = ref(undefined)
const blockedUntil = ref(undefined)
const codeBlocked = computed(() => !!blockedUntil.value && Date.now() < blockedUntil.value)
const friendlyDate = (ms) => { try { return new Date(ms).toLocaleString() } catch { return '' } }
const planExpiresAtDisplay = computed(() => { const exp = auth.profile?.planExpiresAt; if (!exp) return '-'; const ms = exp.toMillis ? exp.toMillis() : exp; if (!ms) return '-'; try { return new Date(ms).toLocaleDateString() } catch { return '-' } })
const validateCode = async () => { if (!codeValue.value || validating.value) return; validating.value = true; codeMsg.value=''; codeError.value=false; attemptsLeft.value=undefined; blockedUntil.value=undefined; const { ok, error, newExp, attemptsLeft: al, blockedUntil: bu } = await auth.redeemCode(codeValue.value); validating.value=false; if (ok) { codeMsg.value = t('settings.code.success', { date: (newExp?.toMillis ? new Date(newExp.toMillis()) : new Date()).toLocaleDateString() }); codeError.value=false; codeValue.value=''; attemptsLeft.value=undefined; blockedUntil.value=undefined } else { codeMsg.value = error || t('errors.invite.invalid'); codeError.value=true; attemptsLeft.value = al; blockedUntil.value = bu } }
const codeExtraMsg = computed(() => { if (codeBlocked.value && blockedUntil.value) return t('settings.code.blocked', { date: friendlyDate(blockedUntil.value) }); if (attemptsLeft.value != null && attemptsLeft.value >= 0) return t('settings.code.attempts', { n: attemptsLeft.value }); return '' })
const codeInputClass = computed(() => codeBlocked.value ? 'code-input-blocked' : codeError.value ? 'code-input-error' : (!codeError.value && codeMsg.value && !codeValue.value) ? 'code-input-success' : '')

const showCodeInput = ref(false)
const codeValue = ref('')
const validating = ref(false)
const codeMsg = ref('')
const codeError = ref(false)
</script>

<template>
  <section class="settings">
    <header class="page-header">
      <div class="title">
        <svg class="icon" v-html="SettingsIcon" aria-hidden="true"></svg>
        <div>
          <h1>{{ t('settings.title') }}</h1>
          <p class="subtitle">{{ t('settings.theme.subtitle') }}</p>
        </div>
      </div>
    </header>

    <article class="card">
      <h2 class="card-title">{{ t('settings.accountStatus') }}</h2>
      <div style="display:flex;flex-direction:column;gap:.5rem">
        <div><strong>{{ t('settings.accountStatus') }}:</strong> {{ auth.isReadOnly ? 'Inactiva' : 'Activa' }}</div>
        <div><strong>{{ t('settings.expiresAt') }}:</strong> {{ planExpiresAtDisplay }}</div>
        <p style="font-size:.75rem;color:var(--muted-text-color)">{{ auth.isReadOnly ? 'Ingresa un nuevo código para activar o extender tu plan.' : 'Puedes ingresar un código adicional para extender tu plan actual.' }}</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="button" type="button" @click="showCodeInput = !showCodeInput">{{ t('settings.enterCode') }}</button>
          <button class="button button-secondary" type="button">{{ t('settings.generateCode') }}</button>
        </div>
        <div v-if="showCodeInput" class="code-redeem-wrap">
          <div class="form-field code-field">
            <label>{{ t('auth.signup.code') }}</label>
            <input class="input" :class="codeInputClass" v-model="codeValue" :placeholder="t('auth.signup.code-placeholder')" style="text-transform:uppercase" :disabled="validating || codeBlocked" maxlength="24" />
            <button class="button code-validate-btn" type="button" @click="validateCode" :disabled="!codeValue || validating || codeBlocked" :aria-busy="validating">{{ validating ? t('common.loading') : t('settings.validateCode') }}</button>
            <small v-if="codeMsg" :style="{color: codeError ? 'var(--error-color)' : 'var(--hover-success-color)'}">{{ codeMsg }}</small>
            <small v-if="codeExtraMsg" :style="{color: codeBlocked ? 'var(--warning-color)' : 'var(--muted-text-color)'}">{{ codeExtraMsg }}</small>
          </div>
        </div>
      </div>
    </article>

    <article class="card">
      <h2 class="card-title">{{ t('settings.currencies.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.currencies.subtitle') }}</p>
      <div v-if="currencies.status==='loading'">{{ t('common.loading') }}</div>
      <div v-else class="curr-grid">
        <table class="curr-table" v-if="currencies.items.length">
          <thead>
          <tr>
            <th>{{ t('settings.currencies.code') }}</th>
            <th>{{ t('settings.currencies.symbol') }}</th>
            <th>{{ t('settings.currencies.name') }}</th>
            <th>{{ t('settings.currencies.isDefault') }}</th>
            <th></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="c in currencies.items" :key="c.id">
            <td>{{ c.code }}</td>
            <td>{{ c.symbol }}</td>
            <td>{{ c.name }}</td>
            <td>
              <input type="radio" name="defCur" :checked="c.isDefault" @change="setDefault(c.id)" :aria-label="t('settings.currencies.isDefault')" :disabled="!auth.canWrite" />
              <span v-if="c.isDefault" class="badge badge-green" style="margin-left:.5rem">{{ t('settings.currencies.defaultBadge') }}</span>
            </td>
            <td><button class="button button-delete" @click="removeCurrency(c.id)" :disabled="c.isDefault || !auth.canWrite">✕</button></td>
          </tr>
          </tbody>
        </table>
        <form class="add-form" @submit.prevent="addCurrency">
          <div class="row-inline">
            <input class="input" v-model="newCur.code" :placeholder="t('settings.currencies.code')" maxlength="5" style="text-transform:uppercase" :disabled="!auth.canWrite" />
            <input class="input" v-model="newCur.symbol" :placeholder="t('settings.currencies.symbol')" maxlength="4" :disabled="!auth.canWrite" />
            <input class="input" v-model="newCur.name" :placeholder="t('settings.currencies.name')" maxlength="30" :disabled="!auth.canWrite" />
            <label class="chk"><input type="checkbox" v-model="newCur.isDefault" :disabled="!auth.canWrite" /> {{ t('settings.currencies.isDefault') }}</label>
            <button class="button" type="submit" :disabled="busy || !newCur.code || !auth.canWrite">{{ t('settings.currencies.add') }}</button>
          </div>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        </form>
      </div>
    </article>

    <article class="card">
      <h2 class="card-title">{{ t('settings.amountFormat.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.amountFormat.subtitle') }}</p>
      <div class="amount-format-options">
        <label class="opt">
          <input type="radio" name="amount-format" value="full" :checked="settings.amountFormat==='full'" @change="settings.setAmountFormat('full')" :disabled="!auth.canWrite" />
          <span>{{ t('settings.amountFormat.full') }}</span>
        </label>
        <label class="opt">
          <input type="radio" name="amount-format" value="compact" :checked="settings.amountFormat==='compact'" @change="settings.setAmountFormat('compact')" :disabled="!auth.canWrite" />
          <span>{{ t('settings.amountFormat.compact') }}</span>
        </label>
      </div>
    </article>

    <article class="card">
      <h2 class="card-title">{{ t('settings.theme.presets.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.theme.presets.subtitle') }}</p>
      <section class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.light') }}</h3>
        <div class="presets-grid">
          <button v-for="p in lightPresets" :key="p.id" class="preset" type="button" @click="applyPreset(p.id)" :aria-label="t(p.nameKey)" :disabled="!auth.canWrite">
            <span class="swatches" aria-hidden="true">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </section>
      <section class="preset-group">
        <h3 class="group-title">{{ t('settings.theme.presets.dark') }}</h3>
        <div class="presets-grid">
          <button v-for="p in darkPresets" :key="p.id" class="preset" type="button" @click="applyPreset(p.id)" :aria-label="t(p.nameKey)" :disabled="!auth.canWrite">
            <span class="swatches" aria-hidden="true">
              <span class="sw" :style="{ background: p.vars['--background-color'] }" title="bg"></span>
              <span class="sw" :style="{ background: p.vars['--primary-color'] }" title="primary"></span>
              <span class="sw" :style="{ background: p.vars['--secondary-color'] }" title="secondary"></span>
              <span class="sw" :style="{ background: p.vars['--accent-color'] }" title="accent"></span>
              <span class="sw" :style="{ background: p.vars['--text-color'] }" title="text"></span>
            </span>
            <span class="preset-name">{{ t(p.nameKey) }}</span>
          </button>
        </div>
      </section>
      <p class="hint">{{ t('settings.theme.presets.hint') }}</p>
    </article>

    <article class="card">
      <h2 class="card-title">{{ t('settings.theme.title') }}</h2>
      <p class="card-subtitle">{{ t('settings.theme.subtitle') }}</p>
      <div class="vars-grid">
        <div v-for="v in EDITABLE_VARS" :key="v.key" class="row">
          <label class="row-label" :for="v.key">{{ v.label }}</label>
          <div class="controls">
            <div class="color-wrap">
              <input class="color" :id="v.key" type="color" :value="settings.themeVars[v.key]" @input="onInput(v.key, $event)" :aria-label="v.label" :disabled="!auth.canWrite" />
            </div>
            <input class="text" type="text" :value="settings.themeVars[v.key]" @input="onInput(v.key, $event)" inputmode="text" spellcheck="false" :disabled="!auth.canWrite" />
          </div>
        </div>
      </div>
      <div class="preview">
        <h2 class="card-title">{{ t('settings.preview') }}</h2>
        <p class="card-subtitle">{{ t('settings.previewDesc') }}</p>
        <div class="badges">
          <span class="badge" :style="{background: 'var(--tx-expense-color)', color: 'var(--white)'}">{{ t('transactions.form.expense') }}</span>
          <span class="badge" :style="{background: 'var(--tx-goal-color)', color: 'var(--black)'}">{{ t('transactions.form.goalSaving') }}</span>
          <span class="badge" :style="{background: 'var(--tx-debtPayment-color)', color: 'var(--white)'}">{{ t('transactions.form.debtPayment') }}</span>
          <span class="badge" :style="{background: 'var(--tx-income-color)', color: 'var(--white)'}">{{ t('transactions.form.income') }}</span>
          <span class="badge" :style="{background: 'var(--tx-transfer-color)', color: 'var(--black)'}">{{ t('common.transfer') }}</span>
        </div>
        <div class="buttons">
          <button class="button" :disabled="!auth.canWrite">{{ t('settings.samplePrimary') }}</button>
          <button class="button button-secondary" :disabled="!auth.canWrite">{{ t('settings.sampleSecondary') }}</button>
        </div>
      </div>
      <div class="actions">
        <button class="button button-secondary" @click="reset" :disabled="!auth.canWrite">{{ t('settings.reset') }}</button>
        <button class="button" @click="save" :disabled="!auth.canWrite">{{ t('common.save') }}</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title { display:flex; align-items:center; gap:.75rem; }
.title .icon { width:28px; height:28px; color: var(--accent-color); }
.title h1 { margin:0; line-height:1.1; }
.subtitle { margin:.25rem 0 0; color: var(--muted-text-color); }

.card {
  border-radius: 12px;
  background: var(--primary-color);
  border: 1px solid var(--secondary-color);
  box-shadow: 0 4px 14px var(--shadow-elev-1, rgba(0,0,0,.25));
  padding: 1rem;
}
.card + .card { margin-top: .25rem; }
.card-title { margin: 0 0 .25rem; font-size: 1.05rem; }
.card-subtitle { margin: 0 0 1rem; color: var(--muted-text-color); }

.preset-group { margin: .25rem 0 1rem; }
.group-title { margin: 0 0 .5rem; font-size: .95rem; opacity: .9; }

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: .6rem;
}
.preset {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: .5rem;
  width: 100%;
  padding: .65rem .7rem;
  border: 1px solid var(--secondary-color);
  background: var(--primary-color);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  box-shadow: 0 1px 3px var(--shadow-elev-1, rgba(0,0,0,.2));
  text-align: left;
}
.preset:hover { transform: translateY(-1px); filter: brightness(1.03); }
.preset:focus { outline: 2px solid var(--accent-color); outline-offset: 2px; }
.swatches { display:flex; gap:3px; }
.sw { width:16px; height:16px; border-radius:4px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.15); }
.preset-name { font-size: .9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hint { margin: .75rem 0 0; color: var(--muted-text-color); }

.vars-grid {
  display: grid;
  gap: .75rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: .5rem;
  padding: .5rem;
  border-radius: 8px;
  background: color-mix(in oklab, var(--secondary-color) 85%, transparent);
  border: 1px solid var(--secondary-color);
}
.row-label { font-weight: 600; font-size: .95rem; }
.controls {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .6rem;
  align-items: center;
}

.color-wrap {
  width: 48px; height: 38px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--primary-color);
  background: var(--secondary-color);
  display: grid; place-items: center;
}
.color {
  appearance: none;
  -webkit-appearance: none;
  width: 100%; height: 100%;
  border: none; padding: 0; cursor: pointer;
  background: transparent;
}
.color::-webkit-color-swatch-wrapper { padding: 0; }
.color::-webkit-color-swatch { border: none; border-radius: 6px; }
.color::-moz-color-swatch { border: none; border-radius: 6px; }

.text {
  background: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  padding: .6rem .7rem;
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .9rem;
}

.actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
  margin-top: 1rem;
  position: sticky;
  bottom: .5rem;
  background: color-mix(in oklab, var(--primary-color) 80%, transparent);
  padding-top: .5rem;
}

.amount-format-options { display:flex; gap:1rem; flex-wrap:wrap; }
.amount-format-options .opt { display:flex; gap:.5rem; align-items:center; background: var(--secondary-color); padding:.6rem .8rem; border-radius:8px; cursor:pointer; }
.amount-format-options input[type=radio] { accent-color: var(--accent-color); }

.preview {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--background-color);
  border: 1px solid var(--secondary-color);
  box-shadow: 0 2px 8px var(--shadow-elev-1, rgba(0,0,0,.2));
}

.preview .badges {
  display:flex; gap:.5rem; flex-wrap:wrap;
}
.badge { display:inline-block; padding:.3rem .6rem; border-radius:999px; font-size:.8rem }
.preview .buttons {
  margin-top: 1rem;
  display:flex; gap:.5rem; flex-wrap:wrap;
}

.curr-grid { display:grid; gap:1rem }
.curr-table { width:100%; border-collapse:collapse; font-size:.85rem }
.curr-table th, .curr-table td { padding:.5rem .6rem; border-bottom:1px solid var(--secondary-color) }
.curr-table th { text-align:left; background: var(--secondary-color); }
.add-form .row-inline { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center }
.add-form .input { background: var(--secondary-color); border:1px solid var(--primary-color); color: var(--text-color); padding:.5rem .6rem; border-radius:6px; width:140px }
.add-form .chk { font-size:.75rem; display:flex; align-items:center; gap:.25rem }
.error { color: var(--error-color); font-size:.75rem; margin:.25rem 0 0 }
.badge-green { background: var(--hover-success-color); color: var(--white); padding:.15rem .4rem; border-radius:999px; font-size:.65rem }
@media (min-width: 720px) {
  .vars-grid .row {
    grid-template-columns: 220px 1fr;
    align-items: center;
  }
}

@media (max-width: 719.98px) {
  .page-header { margin-bottom: .25rem; }
  .card { padding: .85rem; }
  .color-wrap { width: 44px; height: 36px; }
  .preset { padding: .6rem; }
}

.code-redeem-wrap { display:flex; flex-direction:column; gap:.75rem; margin-top:.5rem; }
.code-field { display:flex; flex-direction:column; gap:.5rem; min-width:260px; max-width:340px }
.code-field label { font-size:.75rem; font-weight:600; letter-spacing:.5px; color: var(--muted-text-color); }
.code-field .input { background: var(--secondary-color); border:1px solid var(--primary-color); padding:.65rem .75rem; border-radius:8px; font-size:.95rem; letter-spacing:.5px; font-weight:600; color: var(--text-color); }
.code-field .input::placeholder { color: var(--muted-text-color); }
.code-field .input:focus { outline:none; border-color: var(--accent-color); box-shadow:0 0 0 3px var(--focus-accent-glow) }
.code-field .code-validate-btn { width:100%; margin-top:.15rem }
.code-field small { font-size:.65rem; line-height:1.2 }
.code-input-success { border-color: var(--hover-success-color) !important; box-shadow: 0 0 0 2px color-mix(in srgb,var(--hover-success-color) 55%, transparent) }
.code-input-error { border-color: var(--error-color) !important; box-shadow: 0 0 0 2px color-mix(in srgb,var(--error-color) 55%, transparent) }
.code-input-blocked { border-color: var(--warning-color) !important; box-shadow: 0 0 0 2px color-mix(in srgb,var(--warning-color) 55%, transparent); opacity:.85 }
</style>
