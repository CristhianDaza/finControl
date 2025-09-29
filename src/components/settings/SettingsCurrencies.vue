<script setup>
import { computed, ref, onMounted, defineAsyncComponent } from 'vue'
import { t } from '@/i18n/index.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { useCurrenciesStore } from '@/stores/currencies.js'
import { useAuthStore } from '@/stores/auth.js'

const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fcConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "fcFormField" */() => import('@/components/global/FcFormField.vue'))

const { success: notifySuccess, error: notifyError } = useNotify()
const currencies = useCurrenciesStore()
const auth = useAuthStore()

onMounted(() => {
  if (currencies.status === 'idle')
    currencies.subscribe()
})

const search = ref('')
const sortBy = ref('code')
const sortDir = ref('asc')

const setSort = key => {
  if (sortBy.value === key)
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = key
    sortDir.value = 'asc'
  }
}

const items = computed(() => {
  const q = search.value.trim().toLowerCase()
  let arr = currencies.items
  if (q) {
    arr = arr.filter(c =>
      (c.code || '').toLowerCase().includes(q) ||
      (c.symbol || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q)
    )
  }
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortBy.value
  arr = [...arr].sort((a, b) => {
    const va = (a[key] ?? '').toString().toLowerCase()
    const vb = (b[key] ?? '').toString().toLowerCase()
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
  return arr
})

const newCur = ref({
  code: '',
  symbol: '',
  name: '',
  isDefault: false
})

const busy = ref(false)
const errorMsg = ref('')

const addCurrency = async () => {
  if (!auth.canWrite) return
  errorMsg.value = ''
  if (!newCur.value.code) return
  busy.value = true
  try {
    await currencies.create({ ...newCur.value })
    notifySuccess(t('settings.currencies.notifications.created'))
    newCur.value = {
      code: '',
      symbol: '',
      name: '',
      isDefault: false
    }
  } catch (e) {
    if (/duplicate/i.test(e.message))
      errorMsg.value = t('currency.errors.duplicate')
    else if (/invalid-code/i.test(e.message))
      errorMsg.value = t('currency.errors.invalid')
    else
      errorMsg.value = t('errors.generic')
    notifyError(errorMsg.value)
  } finally {
    busy.value = false
  }
}

const setDefault = async id => {
  if (!auth.canWrite) return
  try {
    await currencies.setDefault(id)
    notifySuccess(t('settings.currencies.notifications.defaultChanged'))
  } catch {
    notifyError(t('errors.generic'))
  }
}

const confirmDeleteOpen = ref(false)
const toDeleteId = ref(null)

const askRemove = id => {
  if (!auth.canWrite) return
  toDeleteId.value = id
  confirmDeleteOpen.value = true
}

const removeCurrency = async () => {
  const id = toDeleteId.value
  if (!id) return
  try {
    await currencies.remove(id)
    notifySuccess(t('settings.currencies.notifications.deleted'))
  } catch (e) {
    notifyError(t('currency.errors.cannotDeleteDefault'))
  } finally {
    toDeleteId.value = null
  }
}
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.currencies.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.currencies.subtitle') }}
    </p>

    <div class="curr-grid">
      <div class="row-inline" style="margin:0; padding:0">
        <FcFormField
          id="curr-search"
          v-model="search"
          :placeholder="t('settings.currencies.search')"
          autocomplete="off"
        />
      </div>

      <div v-if="currencies.status==='loading'">{{ t('common.loading') }}</div>

      <div v-else>
        <div v-if="items.length" class="table-container curr-table-wrap">
          <table class="curr-table">
            <thead>
              <tr>
                <th @click="setSort('code')">
                  {{ t('settings.currencies.code') }}
                </th>
                <th @click="setSort('symbol')">
                  {{ t('settings.currencies.symbol') }}
                </th>
                <th @click="setSort('name')">
                  {{ t('settings.currencies.name') }}
                </th>
                <th @click="setSort('isDefault')">
                  {{ t('settings.currencies.isDefault') }}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in items" :key="c.id">
                <td :data-label="t('settings.currencies.code')">
                  {{ c.code }}
                </td>
                <td :data-label="t('settings.currencies.symbol')">
                  {{ c.symbol }}
                </td>
                <td :data-label="t('settings.currencies.name')">
                  {{ c.name }}
                </td>
                <td :data-label="t('settings.currencies.isDefault')">
                  <div class="row-center-wrap">
                    <input
                      type="radio"
                      name="defCur"
                      :checked="c.isDefault"
                      @change="setDefault(c.id)"
                      :aria-label="t('settings.currencies.isDefault')"
                      :disabled="!auth.canWrite"
                    />
                    <span
                      v-if="c.isDefault"
                      class="badge badge-green"
                    >
                      {{ t('settings.currencies.defaultBadge') }}
                    </span>
                  </div>
                </td>
                <td :data-label="''">
                  <button
                    class="button button-delete"
                    @click="askRemove(c.id)"
                    :disabled="c.isDefault || !auth.canWrite"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <form class="add-form" @submit.prevent="addCurrency">
          <div class="row-inline">
            <FcFormField
              id="cur-code"
              v-model="newCur.code"
              :placeholder="t('settings.currencies.code')"
              maxlength="5"
              :disabled="!auth.canWrite"
              @update:modelValue="val => newCur.code = (val || '').toString().toUpperCase().slice(0,5)"
              style="text-transform: uppercase;"
            />
            <FcFormField
              id="cur-symbol"
              v-model="newCur.symbol"
              :placeholder="t('settings.currencies.symbol')"
              maxlength="4"
              :disabled="!auth.canWrite"
            />
            <FcFormField
              id="cur-name"
              v-model="newCur.name"
              :placeholder="t('settings.currencies.name')"
              maxlength="30"
              :disabled="!auth.canWrite"
            />
            <label class="chk">
              <input type="checkbox" v-model="newCur.isDefault" :disabled="!auth.canWrite" />
              {{ t('settings.currencies.isDefault') }}
            </label>
            <button class="button" type="submit" :disabled="busy || !newCur.code || !auth.canWrite">{{ t('settings.currencies.add') }}</button>
          </div>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        </form>
      </div>
    </div>

    <FCConfirmModal
      v-model:open="confirmDeleteOpen"
      :title="t('settings.currencies.confirmDeleteTitle')"
      :message="t('settings.currencies.confirmDeleteMessage')"
      :confirmText="t('common.delete')"
      :cancelText="t('common.cancel')"
      @confirm="removeCurrency"
    />
  </article>
</template>

<style scoped>
.curr-grid {
  display: grid;
  gap: 1.5rem;
}

.curr-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--secondary-color);
  background: var(--secondary-color);
}

.curr-table {
  width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  background: transparent;
}

.curr-table th {
  background: var(--primary-color);
  color: var(--text-color);
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid var(--secondary-color);
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
}

.curr-table td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--secondary-color) 50%, transparent);
  vertical-align: middle;
}

.curr-table tbody tr:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.curr-table tbody tr:last-child td {
  border-bottom: none;
}

.curr-table th,
.curr-table td {
  white-space: nowrap;
}

.curr-table td:nth-child(3) {
  white-space: normal;
  max-width: 200px;
}

@media (max-width: 720px) {
  .curr-table-wrap {
    border: none;
    background: transparent;
  }

  .curr-table,
  .curr-table thead,
  .curr-table tbody,
  .curr-table th,
  .curr-table td,
  .curr-table tr {
    display: block;
  }

  .curr-table thead tr {
    position: absolute;
    top: -9999px;
    left: -9999px;
  }

  .curr-table tr {
    background: var(--secondary-color);
    border-radius: 8px;
    margin-bottom: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--primary-color);
  }

  .curr-table tr:hover {
    background: color-mix(in srgb, var(--secondary-color) 90%, var(--accent-color));
  }

  .curr-table td {
    border: none;
    border-bottom: 1px solid var(--primary-color);
    position: relative;
    padding: 0.5rem 0 0.5rem 40%;
    white-space: normal;
    text-align: left;
  }

  .curr-table td:last-child {
    border-bottom: none;
  }

  .curr-table td:before {
    content: attr(data-label) ": ";
    position: absolute;
    left: 0;
    width: 35%;
    padding-right: 0.5rem;
    white-space: nowrap;
    font-weight: 600;
    color: var(--muted-text-color);
    font-size: 0.8rem;
  }

  .curr-table td:nth-child(4) div {
    justify-content: flex-start;
  }
}

.add-form {
  background: var(--secondary-color);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--primary-color);
}

.add-form .row-inline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1rem;
}

.add-form .input {
  background: var(--primary-color);
  border: 2px solid var(--secondary-color);
  color: var(--text-color);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.add-form .input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 20%, transparent);
}

.add-form .input::placeholder {
  color: var(--muted-text-color);
  opacity: 0.8;
}

.add-form .chk {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--primary-color);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 2px solid var(--secondary-color);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.add-form .chk:hover {
  background: color-mix(in srgb, var(--primary-color) 85%, var(--accent-color));
}

.add-form .chk input[type="checkbox"] {
  accent-color: var(--accent-color);
  margin: 0;
}

.add-form .button {
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 100px;
}

.error {
  color: var(--error-color);
  font-size: .75rem;
  margin: .25rem 0 0;
}

.badge-green {
  background: linear-gradient(135deg, var(--hover-success-color), var(--success-color));
  color: var(--white);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--success-color) 40%, transparent);
}
</style>
