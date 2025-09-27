<template>
  <div class="virtual-table-container">
    <div class="table-header">
      <table>
        <thead>
          <tr>
            <th>{{ t('transactions.table.date') }}</th>
            <th>{{ t('transactions.table.description') }}</th>
            <th>{{ t('transactions.table.amount') }}</th>
            <th>{{ t('transactions.table.account') }}</th>
            <th>{{ t('transactions.table.type') }}</th>
            <th>{{ t('transactions.table.actions') }}</th>
          </tr>
        </thead>
      </table>
    </div>

    <div
      ref="containerRef"
      class="virtual-table-body"
      :style="{ height: containerHeight + 'px' }"
      @scroll="handleScroll"
    >
      <div :style="tableStyle">
        <div :style="visibleRowsStyle">
          <table>
            <tbody>
              <tr
                v-for="(item, index) in visibleItems"
                :key="item.id"
                :class="{
                  'row-income': item.type==='income',
                  'row-expense': item.type==='expense' && !(item.goalId || item.goal),
                  'row-debt': item.type==='debtPayment',
                  'row-goal': item.type==='expense' && (item.goalId || item.goal)
                }"
                :style="{ height: itemHeight + 'px' }"
              >
                <td :data-label="t('transactions.table.date')">{{ item.date }}</td>
                <td :data-label="t('transactions.table.description')">{{ item.note || item.description }}</td>
                <td :data-label="t('transactions.table.amount')">{{ formatAmount(item.amount, item.currency || 'COP') }}</td>
                <td :data-label="t('transactions.table.account')">{{ accountNameById[item.accountId] || item.accountId }}</td>
                <td :data-label="t('transactions.table.type')">{{ getTypeLabel(item) }}</td>
                <td :data-label="t('transactions.table.actions')">
                  <div class="actions">
                    <button
                      class="button button-edit"
                      @click="$emit('edit', item)"
                      :disabled="!canWrite"
                      :aria-disabled="!canWrite"
                    >
                      <svg class="icon-edit" v-html="EditIcon"></svg>
                    </button>
                    <button
                      class="button button-delete"
                      @click="$emit('delete', item.id)"
                      :disabled="!canWrite"
                      :aria-disabled="!canWrite"
                    >
                      <svg class="icon-delete" v-html="DeleteIcon"></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="showPerformanceInfo" class="performance-info">
        <small>
          Rendering {{ virtualizedItemsCount }}/{{ itemsCount }} items ({{ renderRatio }}%)
          <span v-if="isScrolling" class="scrolling-indicator">📜</span>
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useVirtualTable } from '@/composables/useVirtualScroll.js'
import { formatAmount } from '@/utils/formatters.js'
import { t } from '@/i18n/index.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  accountNameById: {
    type: Object,
    default: () => ({})
  },
  canWrite: {
    type: Boolean,
    default: false
  },
  containerHeight: {
    type: Number,
    default: 500
  },
  itemHeight: {
    type: Number,
    default: 60
  },
  showPerformanceInfo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete'])

const {
  containerRef,
  visibleItems,
  visibleStartIndex,
  visibleEndIndex,
  totalHeight,
  offsetY,
  isScrolling,
  virtualizedItemsCount,
  renderRatio,
  setItems,
  handleScroll,
  tableStyle,
  visibleRowsStyle,
  itemsCount
} = useVirtualTable({
  itemHeight: props.itemHeight,
  containerHeight: props.containerHeight,
  overscan: 5
})

watch(() => props.items, (newItems) => {
  setItems(newItems)
}, { immediate: true })

const getTypeLabel = (item) => {
  const isGoal = item.type === 'expense' && (item.goalId || item.goal)
  if (item.type === 'income') return t('transactions.form.income')
  if (item.type === 'debtPayment') return t('transactions.form.debtPayment')
  if (isGoal) return t('transactions.form.goalSaving')
  return t('transactions.form.expense')
}
</script>

<style scoped>
.virtual-table-container {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow-elev-1);
  overflow: hidden;
  background-color: var(--primary-color);
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--secondary-color);
  border-bottom: 2px solid var(--accent-color);
}

.table-header table {
  width: 100%;
  border-collapse: collapse;
  margin: 0;
}

.virtual-table-body {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-table-body::-webkit-scrollbar {
  width: 8px;
}

.virtual-table-body::-webkit-scrollbar-thumb {
  background-color: var(--secondary-color);
  border-radius: 4px;
}

.virtual-table-body::-webkit-scrollbar-track {
  background-color: var(--primary-color);
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--primary-color);
  color: var(--text-color);
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
  height: 60px;
}

td {
  font-size: 0.95rem;
  color: var(--text-color);
  height: 60px;
  vertical-align: middle;
}

td:nth-child(4) {
  font-weight: bold;
  text-transform: uppercase;
}

tr:hover {
  background-color: color-mix(in srgb, var(--primary-color) 88%, var(--text-color));
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

tr.row-income {
  box-shadow: inset 6px 0 0 var(--tx-income-color);
}
tr.row-expense {
  box-shadow: inset 6px 0 0 var(--tx-expense-color);
}
tr.row-debt {
  box-shadow: inset 6px 0 0 var(--tx-debtPayment-color);
}
tr.row-goal {
  box-shadow: inset 6px 0 0 var(--tx-goal-color);
}

.button[disabled],
.button[aria-disabled="true"] {
  opacity: 0.55;
  cursor: not-allowed;
}

.performance-info {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  pointer-events: none;
  z-index: 5;
}

.scrolling-indicator {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .table-header {
    display: none;
  }

  .virtual-table-body table {
    display: block;
  }

  .virtual-table-body tbody {
    display: block;
  }

  .virtual-table-body tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--secondary-color);
    border-radius: 8px;
    padding: 1rem;
    background: var(--primary-color);
  }

  .virtual-table-body td {
    display: block;
    padding: 0.5rem 0;
    border: none;
    text-align: left;
  }

  .virtual-table-body td:before {
    content: attr(data-label) ": ";
    font-weight: bold;
    color: var(--accent-color);
  }

  .actions {
    justify-content: flex-start;
    margin-top: 0.5rem;
  }
}
</style>
