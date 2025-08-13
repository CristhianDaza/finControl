<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { t, formatCurrency } from '@/i18n/index.js'
import { useAccountsStore } from '@/stores/accounts.js'
import { useFormattedNumber } from '@/composables/useFormattedNumber.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  value: { type: Object, default: null }
})
const emit = defineEmits(['update:open', 'submit'])
const acc = useAccountsStore()
const local = ref({ fromAccountId: '', toAccountId: '', amountFrom: '', currencyFrom: '', amountTo: '', currencyTo: '', rate: '', date: '', note: '' })
const submitting = ref(false)
const errors = ref({})

const accountsOptions = computed(() => acc.items.map(a => ({ label: `${a.name} · ${formatCurrency(a.balance, a.currency || 'COP')} · ${a.currency || 'COP'}`, value: a.id, currency: a.currency || 'COP' })))
const fromAcc = computed(() => acc.items.find(a => a.id === local.value.fromAccountId))
const toAcc = computed(() => acc.items.find(a => a.id === local.value.toAccountId))

const reset = () => { local.value = { fromAccountId: '', toAccountId: '', amountFrom: '', currencyFrom: '', amountTo: '', currencyTo: '', rate: '', date: '', note: '' }; errors.value = {} }

const applyFromAccount = () => { if (fromAcc.value) local.value.currencyFrom = fromAcc.value.currency || 'COP' }
const applyToAccount = () => { if (toAcc.value) local.value.currencyTo = toAcc.value.currency || local.value.currencyFrom || 'COP' }

watch(() => local.value.fromAccountId, () => { applyFromAccount(); calcAmountTo() })
watch(() => local.value.toAccountId, () => { applyToAccount(); calcAmountTo() })
watch(() => local.value.rate, () => calcAmountTo())
watch(() => local.value.amountFrom, () => calcAmountTo())

const sameCurrency = computed(() => local.value.currencyFrom && local.value.currencyTo && local.value.currencyFrom === local.value.currencyTo)
const calcAmountTo = () => {
  if (sameCurrency.value) { local.value.rate = ''; local.value.amountTo = local.value.amountFrom; return }
  const a = Number(local.value.amountFrom)
  const r = Number(local.value.rate)
  if (a > 0 && r > 0) local.value.amountTo = Math.round(a * r * 100) / 100
}

const validate = () => {
  const e = {}
  if (!local.value.fromAccountId) e.fromAccountId = t('validation.required')
  if (!local.value.toAccountId) e.toAccountId = t('validation.required')
  if (local.value.fromAccountId && local.value.toAccountId && local.value.fromAccountId === local.value.toAccountId) e.same = t('transfers.invalid_accounts')
  if (!(Number(local.value.amountFrom) > 0)) e.amountFrom = t('validation.positive_amount')
  if (!local.value.date) e.date = t('validation.required')
  if (!sameCurrency.value) { if (!(Number(local.value.rate) > 0)) e.rate = t('validation.required') }
  errors.value = e
  return Object.keys(e).length === 0
}

const onClose = () => emit('update:open', false)
const onSubmit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = { fromAccountId: local.value.fromAccountId, toAccountId: local.value.toAccountId, amountFrom: Number(local.value.amountFrom), currencyFrom: local.value.currencyFrom || 'COP', amountTo: Number(local.value.amountTo) || undefined, currencyTo: local.value.currencyTo || local.value.currencyFrom || 'COP', rate: sameCurrency.value ? undefined : Number(local.value.rate), date: local.value.date, note: local.value.note || '' }
    emit('submit', payload)
    emit('update:open', false)
  } finally { submitting.value = false }
}

watch(() => props.open, v => { if (v) { if (props.mode === 'edit' && props.value) {
  const base = props.value.out || props.value
  local.value = { fromAccountId: base.fromAccountId, toAccountId: base.toAccountId, amountFrom: Number(base.amountFrom), currencyFrom: base.currencyFrom, amountTo: Number(base.amountTo), currencyTo: base.currencyTo, rate: base.currencyFrom === base.currencyTo ? '' : base.rate || '', date: base.date, note: base.note || '' }
} else { reset() } } })

onMounted(() => { if (acc.status === 'idle') acc.subscribeMyAccounts() })

const amountFromModel = computed({ get: () => local.value.amountFrom, set: v => { local.value.amountFrom = v } })
const amountToModel = computed({ get: () => local.value.amountTo, set: v => { local.value.amountTo = v } })
const formattedAmountFrom = useFormattedNumber(amountFromModel)
const formattedAmountTo = useFormattedNumber(amountToModel)
</script>

<template>
  <transition name="fade">
    <Teleport to="body">
      <div v-if="open" class="modal-overlay" @click.self="onClose">
        <div class="modal-content">
          <header class="modal-header"><h2 class="modal-title">{{ mode==='edit' ? t('transfers.edit') : t('transfers.new') }}</h2></header>
          <div class="modal-body">
            <div>
              <label>{{ t('transfers.from') }}</label>
              <select class="input" v-model="local.fromAccountId">
                <option value="">{{ t('common.select-option') }}</option>
                <option v-for="o in accountsOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <div v-if="errors.fromAccountId" class="error">{{ errors.fromAccountId }}</div>
            </div>
            <div>
              <label>{{ t('transfers.to') }}</label>
              <select class="input" v-model="local.toAccountId">
                <option value="">{{ t('common.select-option') }}</option>
                <option v-for="o in accountsOptions" :key="o.value+':to'" :value="o.value">{{ o.label }}</option>
              </select>
              <div v-if="errors.toAccountId" class="error">{{ errors.toAccountId }}</div>
            </div>
            <div v-if="errors.same" class="error">{{ errors.same }}</div>
            <div>
              <label>{{ t('transfers.amount') }} ({{ local.currencyFrom || (fromAcc&&fromAcc.currency) || 'COP' }})</label>
              <input class="input" type="text" inputmode="decimal" v-model="formattedAmountFrom" />
              <div v-if="errors.amountFrom" class="error">{{ errors.amountFrom }}</div>
            </div>
            <div>
              <label>{{ t('transfers.date') }}</label>
              <input class="input" type="date" v-model="local.date" />
              <div v-if="errors.date" class="error">{{ errors.date }}</div>
            </div>
            <div v-if="!sameCurrency">
              <label>{{ t('transfers.rate') }}</label>
              <input class="input" type="number" step="0.0001" min="0" v-model="local.rate" />
              <div v-if="errors.rate" class="error">{{ errors.rate }}</div>
            </div>
            <div>
              <label>{{ t('transfers.amount') }} ({{ local.currencyTo || (toAcc&&toAcc.currency) || local.currencyFrom || 'COP' }})</label>
              <input class="input" type="text" inputmode="decimal" v-model="formattedAmountTo" :disabled="sameCurrency" />
            </div>
            <div>
              <label>{{ t('transfers.note') }}</label>
              <input class="input" type="text" v-model="local.note" />
            </div>
          </div>
          <footer class="modal-footer">
            <button class="button button-secondary" @click="onClose" :disabled="submitting">{{ t('common.cancel') }}</button>
            <button class="button" @click="onSubmit" :disabled="submitting">{{ t('common.save') }}</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </transition>
</template>

<style scoped>
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-content{background:var(--primary-color);color:var(--text-color);border-radius:12px;padding:1.5rem;min-width:320px;max-width:520px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:1rem}
.modal-header{display:flex;justify-content:space-between;align-items:center}
.modal-title{margin:0;font-size:1.1rem;font-weight:600;border-left:4px solid var(--accent-color);padding-left:.75rem;text-transform:uppercase;letter-spacing:1px}
.modal-body{display:flex;flex-direction:column;gap:.75rem}
.modal-footer{display:flex;justify-content:flex-end;gap:.5rem}
.error{color:var(--error-color);font-size:.85rem}
</style>
