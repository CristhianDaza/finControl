<script setup>
import { watch } from 'vue'
import { useVirtualGrid } from '@/composables/useVirtualScroll.js'
import { formatAmount } from '@/utils/formatters.js'
import { t } from '@/i18n/index.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  canWrite: {
    type: Boolean,
    default: false
  },
  containerHeight: {
    type: Number,
    default: 600
  },
  itemHeight: {
    type: Number,
    default: 140
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
  isScrolling,
  virtualizedItemsCount,
  renderRatio,
  setItems,
  handleScroll,
  gridStyle,
  visibleCardsStyle,
  itemsCount
} = useVirtualGrid({
  itemHeight: props.itemHeight,
  containerHeight: props.containerHeight,
  overscan: 3
})

watch(
  () => props.items,
  newItems => setItems(newItems),
  { immediate: true }
)
</script>

<template>
  <div class="virtual-grid-container">
    <div
      ref="containerRef"
      class="virtual-grid-body"
      :style="{ height: containerHeight + 'px' }"
      @scroll="handleScroll"
    >
      <div :style="gridStyle">
        <div :style="visibleCardsStyle">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="account-card"
            :style="{ height: itemHeight + 'px', minHeight: itemHeight + 'px' }"
          >
            <div class="account-header">
              <h3>{{ item.name }}</h3>
              <p class="account-balance">{{ formatAmount(item.balance, item.currency || 'COP') }}</p>
            </div>
            <div class="account-actions">
              <button
                class="button button-edit"
                :aria-label="t('common.edit')"
                :title="t('common.edit')"
                @click="$emit('edit', item)"
                :disabled="!canWrite"
                :aria-disabled="!canWrite"
              >
                <svg class="icon-edit" v-html="EditIcon"></svg>
              </button>
              <button
                class="button button-delete"
                :aria-label="t('common.delete')"
                :title="t('common.delete')"
                @click="$emit('delete', item.id)"
                :disabled="!canWrite"
                :aria-disabled="!canWrite"
              >
                <svg class="icon-delete" v-html="DeleteIcon"></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showPerformanceInfo" class="performance-info">
        <small>
          Rendering {{ virtualizedItemsCount }}/{{ itemsCount }} accounts ({{ renderRatio }}%)
          <span v-if="isScrolling" class="scrolling-indicator">📜</span>
        </small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-grid-container {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.virtual-grid-body {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  padding: 1rem;
}

.virtual-grid-body::-webkit-scrollbar {
  width: 8px;
}

.virtual-grid-body::-webkit-scrollbar-thumb {
  background-color: var(--secondary-color);
  border-radius: 4px;
}

.virtual-grid-body::-webkit-scrollbar-track {
  background-color: var(--primary-color);
}

.account-card {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border: 1px solid var(--secondary-color);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  color: var(--text-color);
  box-shadow: 0 4px 12px var(--shadow-elev-2);
  width: 100%;
  max-width: 320px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.account-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px var(--shadow-elev-3);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.account-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
  font-weight: 600;
}

.account-balance {
  margin: 0;
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-color);
}

.account-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 1rem;
}

.account-actions button[disabled] {
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

@media (min-width: 768px) {
  .virtual-grid-body {
    padding: 2rem;
  }

  .account-card {
    width: calc(50% - 0.5rem);
    display: inline-block;
    vertical-align: top;
    margin-right: 1rem;
  }
}

@media (min-width: 1200px) {
  .account-card {
    width: calc(33.333% - 0.67rem);
  }
}

@media (min-width: 1600px) {
  .account-card {
    width: calc(25% - 0.75rem);
  }
}
</style>
