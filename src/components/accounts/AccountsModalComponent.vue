<script setup>
import { defineAsyncComponent, ref, watch, computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useCurrenciesStore } from '@/stores/currencies.js'
import { useAuthStore } from '@/stores/auth.js'

const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalAccounts: { type: Boolean, default: false, attribute: 'show-modal-accounts' },
  initial: { type: Object, default: null },
  title: { type: String, default: () => t('accounts.addTitle') }
})

const emit = defineEmits(['save','update:showModal','cancel'])

const account = ref({ id: '', name: '', balance: 0, currency: 'COP' })
const showModal = ref(false)
const isEdit = computed(() => !!account.value.id)
const currencies = useCurrenciesStore()
if (currencies.status === 'idle') { currencies.subscribe() }
const currencyOptions = computed(() => currencies.codeOptions)
const hasMultiple = computed(() => currencyOptions.value.length > 1)
const auth = useAuthStore()
const canWrite = computed(() => auth.canWrite)

const handleAccept = () => { if (!canWrite.value) return; const payload = { id: account.value.id, name: String(account.value.name||'').trim(), balance: Number(account.value.balance||0), currency: account.value.currency || currencies.defaultCurrency.code }; emit('save', payload); emit('update:showModal', false); resetAccount() }
const handleCancel = () => { emit('cancel'); emit('update:showModal', false); resetAccount() }
const resetAccount = () => { account.value = { id: '', name: '', balance: 0, currency: 'COP' } }

watch(() => props.showModalAccounts, v => { showModal.value = v })
watch(() => props.initial, (val) => { if (val) { account.value = { id: val.id || '', name: val.name || '', balance: Number(val.balance || 0), currency: val.currency || 'COP' } } }, { immediate: true })
watch(showModal, v => emit('update:showModal', v))
</script>

<template>
  <FcModal :show-modal="showModal" @accept="handleAccept" @cancel-modal="handleCancel" @update:showModal="showModal = $event" :title-modal="title" :accept-disabled="!canWrite">
    <FcFormField v-model="account.name" :label="t('accounts.form.name')" :placeholder="t('accounts.form.namePlaceholder')" required :maxlength="40" :error-message="t('accounts.form.nameError')" id="account-name" :disabled="!canWrite" />
    <FcFormField v-model="account.balance" :label="t('accounts.form.balance')" type="number" required min="0" step="0.01" format-thousands :error-message="t('accounts.form.balanceError')" id="account-balance" :disabled="isEdit || !canWrite" />
    <FcFormField v-if="hasMultiple" v-model="account.currency" :label="t('accounts.form.currency')" type="select" :options="currencyOptions" :disabled="!canWrite" />
  </FcModal>
</template>

<style scoped>
</style>
