<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useTransactionsStore } from '@/stores/transactions.js'
import FCConfirmModal from '@/components/global/FCConfirmModal.vue'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const TransactionsModalComponent = defineAsyncComponent(() => import('@/components/transactions/TransactionsModalComponent.vue'))
const tx = useTransactionsStore()

const showModal = ref(false)
const modalTitle = ref('Agregar Transacción')
const editing = ref(null)
const confirmOpen = ref(false)
const toDeleteId = ref(null)
const busy = ref(false)

const typeFilter = ref('')
const from = ref('')
const to = ref('')

const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const now = new Date()
const selectedMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())
const months = computed(() => monthNames.map((label, idx) => ({ label, value: idx })))

const rows = computed(() => tx.items)
const hasItems = computed(() => tx.hasItems)
const isLoading = computed(() => tx.status === 'loading')

const openAdd = () => { editing.value = null; modalTitle.value = 'Agregar Transacción'; showModal.value = true }
const openEdit = (item) => { editing.value = item; modalTitle.value = 'Editar Transacción'; showModal.value = true }
const askRemove = (id) => { toDeleteId.value = id; confirmOpen.value = true }

const onSave = async (payload) => {
  busy.value = true
  try {
    if (editing.value && editing.value.id) {
      await tx.edit(editing.value.id, payload)
    } else {
      await tx.add(payload)
    }
    showModal.value = false
    editing.value = null
  } finally {
    busy.value = false
  }
}

const onConfirmRemove = async () => {
  if (!toDeleteId.value) return
  busy.value = true
  try { await tx.remove(toDeleteId.value) } finally { busy.value = false; toDeleteId.value = null }
}

const applyFilters = () => {
  const f = {}
  if (typeFilter.value) f.type = typeFilter.value
  if (from.value) f.from = from.value
  if (to.value) f.to = to.value
  tx.setFilters(f)
}

const setMonth = (m) => {
  selectedMonth.value = m
  const first = new Date(currentYear.value, m, 1)
  const last = new Date(currentYear.value, m + 1, 0)
  const pad = (n) => String(n).padStart(2, '0')
  from.value = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(first.getDate())}`
  to.value = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`
  applyFilters()
}

onMounted(() => { setMonth(selectedMonth.value) })
</script>

<template>
  <section>
    <div class="card" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:space-between">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button
          v-for="m in months"
          :key="m.value"
          class="button"
          :class="selectedMonth === m.value ? '' : 'button-secondary'"
          @click="setMonth(m.value)"
        >
          {{ m.label }} {{ m.value === now.getMonth() ? '' : '' }}
        </button>
      </div>
      <div style="display:flex;gap:1rem;align-items:flex-end">
        <div style="min-width:200px">
          <label style="display:block;margin-bottom:.25rem">Tipo</label>
          <select class="input" v-model="typeFilter" @change="applyFilters">
            <option value="">Todos</option>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:.25rem">Desde</label>
          <input class="input" type="date" v-model="from" @change="applyFilters" />
        </div>
        <div>
          <label style="display:block;margin-bottom:.25rem">Hasta</label>
          <input class="input" type="date" v-model="to" @change="applyFilters" />
        </div>
        <div>
          <button class="button" @click="openAdd" :disabled="busy || isLoading">Agregar Transacción</button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="card" style="margin-top:1rem">Cargando…</div>
    <div v-else-if="!hasItems" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>No hay transacciones</span>
      <button class="button" @click="openAdd">Agregar</button>
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Cuenta</th>
            <th>Tipo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.id" :class="{ 'row-income': item.type==='income', 'row-expense': item.type==='expense' }">
            <td>{{ item.date }}</td>
            <td>{{ item.note || item.description }}</td>
            <td>${{ Number(item.amount||0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
            <td>{{ item.accountId }}</td>
            <td>{{ item.type==='income' ? 'Ingreso' : item.type==='expense' ? 'Gasto' : item.type }}</td>
            <td>
              <div class="actions">
                <button class="button button-edit" @click="openEdit(item)" :disabled="busy">
                  <svg class="icon-edit" v-html="EditIcon"></svg>
                </button>
                <button class="button button-delete" @click="askRemove(item.id)" :disabled="busy">
                  <svg class="icon-delete" v-html="DeleteIcon"></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <TransactionsModalComponent
      :show-modal-transaction="showModal"
      :initial="editing || undefined"
      :title="modalTitle"
      @save="onSave"
      @update:showModalTransaction="showModal = $event"
    />

    <FCConfirmModal
      :open="confirmOpen"
      title="Eliminar transacción"
      message="Esta acción no se puede deshacer. ¿Deseas continuar?"
      confirm-text="Eliminar"
      cancel-text="Cancelar"
      @update:open="confirmOpen = $event"
      @confirm="onConfirmRemove"
    />
  </section>
</template>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.table-container::-webkit-scrollbar {
  height: 8px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: var(--secondary-color);
  border-radius: 4px;
}

table {
  margin-top: 2rem;
  width: 100%;
  border-collapse: collapse;
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

th, td {
  padding: 1rem 1.2rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-color);
}

th {
  background-color: var(--secondary-color);
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background-color: var(--hover-prrimary-color);
  color: var(--secondary-color);
}

td {
  font-size: 0.95rem;
  color: var(--text-color);
}

td:nth-child(4) {
  font-weight: bold;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

tr {
  position: relative;
}

tr::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  border-radius: 4px 0 0 4px;
}

.row-income::before {
  background-color: var(--success-color);
}

.row-expense::before {
  background-color: var(--error-color);
}
</style>
