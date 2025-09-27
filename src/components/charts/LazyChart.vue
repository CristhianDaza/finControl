<template>
  <div ref="chartContainer" class="lazy-chart-container">
    <ChartSkeleton
      v-if="!isChartVisible || isDataProcessing"
      :type="chartType"
      :height="height"
    />

    <div v-if="isDataProcessing && isChartVisible" class="processing-overlay">
      <div class="processing-content">
        <div class="processing-spinner"></div>
        <p>Processing data... {{ processingProgress }}%</p>
      </div>
    </div>

    <div v-show="isChartVisible && !isDataProcessing" class="chart-wrapper">
      <canvas
        ref="canvasRef"
        :aria-label="ariaLabel"
        role="img"
        :style="{ height: height + 'px' }"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useProgressiveCharts } from '@/composables/useProgressiveCharts.js'
import ChartSkeleton from './ChartSkeleton.vue'

const props = defineProps({
  chartType: {
    type: String,
    required: true,
    validator: (value) => ['bar', 'doughnut', 'line'].includes(value)
  },
  chartData: {
    type: Object,
    default: () => ({})
  },
  chartOptions: {
    type: Object,
    default: () => ({})
  },
  rawData: {
    type: Array,
    default: () => []
  },
  height: {
    type: Number,
    default: 300
  },
  ariaLabel: {
    type: String,
    default: 'Chart'
  },
  enableProgressive: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['chart-ready', 'data-processed'])

const canvasRef = ref(null)
let chartInstance = null

const {
  isChartVisible,
  isChartLoaded,
  chartContainer,
  loadChart,
  isDataProcessing,
  processedData,
  memoizedChartData,
  processDataInChunks,
  debouncedUpdate,
  cleanup,
  processingProgress
} = useProgressiveCharts()

const createChart = async () => {
  if (!canvasRef.value || !isChartLoaded.value) return

  try {
    const { useCharts } = await import('@/composables/useCharts.js')
    const { createChart: chartFactory } = useCharts()

    const finalData = props.enableProgressive && memoizedChartData.value
      ? memoizedChartData.value
      : props.chartData

    chartInstance = chartFactory(canvasRef.value.getContext('2d'), {
      type: props.chartType,
      data: finalData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...props.chartOptions
      }
    })

    emit('chart-ready', chartInstance)
  } catch (error) {
    console.error('Failed to create chart:', error)
  }
}

const updateChart = () => {
  if (!chartInstance) return

  const finalData = props.enableProgressive && memoizedChartData.value
    ? memoizedChartData.value
    : props.chartData

  chartInstance.data = finalData
  chartInstance.update('none')
}

watch(() => props.rawData, (newData) => {
  if (props.enableProgressive && newData.length > 0) {
    debouncedUpdate(newData)
  }
}, { deep: true })

watch(() => props.chartData, () => {
  if (!props.enableProgressive) {
    updateChart()
  }
}, { deep: true })

watch(memoizedChartData, () => {
  if (props.enableProgressive) {
    updateChart()
  }
})

watch(isChartLoaded, async (loaded) => {
  if (loaded) {
    await nextTick()
    createChart()
  }
})

watch(processedData, (data) => {
  if (data) {
    emit('data-processed', data)
  }
})

onMounted(() => {
  if (props.enableProgressive && props.rawData.length > 0) {
    processDataInChunks(props.rawData)
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  cleanup()
})
</script>

<style scoped>
.lazy-chart-container {
  position: relative;
  width: 100%;
  min-height: 200px;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
}

.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.processing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: var(--primary-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-elev-2);
}

.processing-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--muted-text-color);
  border-top: 3px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.processing-content p {
  margin: 0;
  color: var(--text-color);
  font-size: 0.9rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
