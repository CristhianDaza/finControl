<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useGoalsStore } from '@/stores/goals.js'
import { t, formatCurrency } from '@/i18n/index.js'

const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(() => import('@/components/global/FcFormField.vue'))

const acc = useAccountsStore()
const goals = useGoalsStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({ name: '', targetAmount: 0, account: '', dueDate: '', note: '', paused: false })

const accountsOptions = computed(() => acc.items.map(a => ({ label: a.name, value: a.id })))
const accountNameById = computed(() => acc.items.reduce((m,a)=>{ m[a.id]=a.name; return m }, {}))

const resetForm = () => { form.value = { name: '', targetAmount: 0, account: '', dueDate: '', note: '', paused: false }; editingId.value = null; isEditing.value = false }
const openCreate = () => { resetForm(); showModal.value = true }
const openEdit = (g) => {
  form.value = { name: g.name || '', targetAmount: Number(g.targetAmount)||0, account: g.accountId || g.account || '', dueDate: g.dueDate || '', note: g.note || '', paused: !!g.paused }
  editingId.value = g.id; isEditing.value = true; showModal.value = true
}

const save = async () => {
  const payload = { name: form.value.name, targetAmount: Number(form.value.targetAmount), accountId: form.value.account, dueDate: form.value.dueDate || null, note: form.value.note, paused: !!form.value.paused }
  if (isEditing.value && editingId.value) await goals.edit(editingId.value, payload)
  else await goals.add(payload)
  showModal.value = false; resetForm(); await goals.loadProgress()
}

const askPauseResume = async (g) => { if (g.paused) await goals.resume(g.id); else await goals.pause(g.id) }
const remove = async (id) => { await goals.remove(id); await goals.loadProgress() }

const goalProgressPct = (id) => Math.round(goals.progressPct(id))
const isCompleted = (id) => goals.isCompleted(id)

onMounted(async () => { await acc.subscribeMyAccounts(); await goals.init(); await goals.loadProgress() })
</script>

<template>
  <section>
    <div class="card page-header">
      <h2 class="page-title">{{ t('goals.title') }}</h2>
      <div class="page-actions">
        <button class="button" @click="openCreate">{{ t('goals.add') }}</button>
      </div>
    </div>

    <div v-if="goals.status==='loading'" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
    <div v-else-if="!goals.items.length" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>{{ t('goals.empty') }}</span>
      <button class="button" @click="openCreate">{{ t('common.add') }}</button>
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>{{ t('goals.table.name') }}</th>
            <th>{{ t('goals.table.account') }}</th>
            <th>{{ t('goals.table.target') }}</th>
            <th>{{ t('goals.table.progress') }}</th>
            <th>{{ t('goals.table.dueDate') }}</th>
            <th>{{ t('goals.table.status') }}</th>
            <th>{{ t('goals.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in goals.items" :key="g.id">
            <td>{{ g.name }}</td>
            <td>{{ accountNameById[g.accountId] || g.accountId }}</td>
            <td>{{ formatCurrency(g.targetAmount) }}</td>
            <td>
              <div class="progress-row">
                <div class="progress-bar"><div class="progress-fill" :style="{ width: goalProgressPct(g.id)+'%' }"></div></div>
                <span class="progress-text">{{ goalProgressPct(g.id) }}%</span>
              </div>
            </td>
            <td>{{ g.dueDate || '-' }}</td>
            <td>
              <span v-if="isCompleted(g.id)" class="badge badge-green">{{ t('goals.completed') }}</span>
              <span v-else class="badge" :class="g.paused ? 'badge-gray' : 'badge-blue'">{{ g.paused ? t('goals.paused') : t('goals.active') }}</span>
            </td>
            <td>
              <div class="actions">
                <button class="button button-edit" @click="openEdit(g)">{{ t('common.edit') }}</button>
                <button class="button button-secondary" @click="askPauseResume(g)">{{ g.paused ? t('goals.resume') : t('goals.pause') }}</button>
                <button class="button button-delete" @click="remove(g.id)">{{ t('common.delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FcModal :show-modal="showModal" :title-modal="isEditing? t('goals.edit') : t('goals.add')" @accept="save" @cancel-modal="showModal=false">
      <div class="grid modal-grid">
        <FcFormField v-model="form.name" :label="t('goals.form.name')" :maxlength="50" required />
        <FcFormField v-model="form.targetAmount" :label="t('goals.form.targetAmount')" type="number" min="1" step="0.01" format-thousands required />
        <FcFormField v-model="form.account" :label="t('goals.form.account')" type="select" :options="accountsOptions" required />
        <FcFormField v-model="form.dueDate" :label="t('goals.form.dueDate')" type="date" />
        <FcFormField v-model="form.note" :label="t('goals.form.note')" />
        <div>
          <label style="display:block;margin-bottom:.25rem">{{ t('recurring.form.paused') }}</label>
          <input type="checkbox" v-model="form.paused" />
        </div>
      </div>
    </FcModal>
  </section>
</template>

<style scoped>
.table-container { width:100%; overflow-x:auto; border-radius:12px; box-shadow:0 2px 8px var(--shadow-elev-1) }
.table-container::-webkit-scrollbar { height:8px }
.table-container::-webkit-scrollbar-thumb { background-color: var(--secondary-color); border-radius: 4px }

table { margin-top: 2rem; width:100%; border-collapse: collapse; background-color: var(--primary-color); color: var(--text-color); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px var(--shadow-elev-1) }
th, td { padding: 1rem 1.2rem; text-align: left; border-bottom: 1px solid var(--secondary-color) }
th { background-color: var(--secondary-color); color: var(--accent-color); font-weight: 600; text-transform: uppercase; font-size: .85rem; letter-spacing: 1px }
tr:last-child td { border-bottom: none }
tr:hover { background-color: var(--hover-prrimary-color) }

.badge { display:inline-block; padding:.125rem .5rem; border-radius:999px; font-size:.75rem }
.badge-gray { background: var(--badge-gray-color); color: var(--white) }
.badge-blue { background: var(--accent-color); color: var(--background-color) }
.badge-green { background: var(--hover-success-color); color: var(--white) }
.actions { display:flex; gap:.5rem; justify-content:flex-end }

.progress-row { display:flex; align-items:center; gap:.5rem }
.progress-bar { width:140px; height:8px; background: var(--secondary-color); border-radius: 999px; overflow: hidden }
.progress-fill { height:100%; background: var(--accent-color) }
.progress-text { font-size: .85rem; color: var(--muted-text-color) }

.page-header { display:flex; justify-content:space-between; align-items:center; gap:.5rem; flex-wrap:wrap }
.page-title { margin:0 }
.page-actions { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap }
.modal-grid { grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 1rem; }
</style>
