import { ref, computed, watch, nextTick, watchEffect } from 'vue'
import { useLazyCharts } from '@/composables/useLazyCharts.js'

export const useProgressiveCharts = () => {
  const { isChartVisible, isChartLoaded, chartContainer, loadChart } = useLazyCharts()
  
  const isDataProcessing = ref(false)
  const processedData = ref(null)
  const dataChunks = ref([])
  const currentChunkIndex = ref(0)
  
  const processDataInChunks = async (rawData, chunkSize = 100) => {
    if (!rawData || rawData.length === 0) return []
    
    isDataProcessing.value = true
    const chunks = []
    
    for (let i = 0; i < rawData.length; i += chunkSize)
      chunks.push(rawData.slice(i, i + chunkSize))
    
    dataChunks.value = chunks
    currentChunkIndex.value = 0
    
    if (chunks.length > 0) {
      processedData.value = await processChunk(chunks[0])
      currentChunkIndex.value = 1
    }
    
    if (chunks.length > 1)
      await processRemainingChunks()
    
    isDataProcessing.value = false
    return processedData.value
  }
  
  const processChunk = async (chunk) => {
    return new Promise((resolve) => {
      const processInIdle = (deadline) => {
        const processed = chunk.map(item => ({
          ...item,
          processedAt: Date.now()
        }))
        resolve(processed)
      }
      
      if (window.requestIdleCallback)
        window.requestIdleCallback(processInIdle)
      else
        setTimeout(() => processInIdle({ timeRemaining: () => 50 }), 0)
    })
  }
  
  const processRemainingChunks = async () => {
    for (let i = currentChunkIndex.value; i < dataChunks.value.length; i++) {
      await nextTick()
      const chunkData = await processChunk(dataChunks.value[i])
      processedData.value = [...(processedData.value || []), ...chunkData]
      currentChunkIndex.value = i + 1
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  const memoizedChartData = computed(() => {
    if (!processedData.value || processedData.value.length === 0)
      return null
    
    return {
      labels: processedData.value.map(item => item.label || item.date || item.name),
      datasets: [{
        data: processedData.value.map(item => item.value || item.amount || 0),
        backgroundColor: processedData.value.map((_, index) =>
          `hsl(${(index * 137.508) % 360}, 70%, 50%)`
        )
      }]
    }
  })
  
  const memoizedChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    },
    animation: {
      duration: isDataProcessing.value ? 0 : 300
    }
  }))
  
  let updateTimeout = null
  const debouncedUpdate = (newData, delay = 300) => {
    clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      processDataInChunks(newData)
    }, delay)
  }
  
  watch(isChartVisible, async (visible) => {
    if (visible && !isChartLoaded.value)
      await loadChart()
  })
  
  const cleanup = () => {
    clearTimeout(updateTimeout)
    processedData.value = null
    dataChunks.value = []
    currentChunkIndex.value = 0
  }
  
  watchEffect(() => {
    if (!isChartVisible.value && processedData.value) {
      setTimeout(() => {
        if (!isChartVisible.value) {
          processedData.value = null
          dataChunks.value = []
          currentChunkIndex.value = 0
        }
      }, 5000)
    }
  })

  return {
    isChartVisible,
    isChartLoaded,
    chartContainer,
    loadChart,
    isDataProcessing,
    processedData,
    memoizedChartData,
    memoizedChartOptions,
    processDataInChunks,
    debouncedUpdate,
    cleanup,
    processingProgress: computed(() => {
      if (dataChunks.value.length === 0) return 100
      return Math.round((currentChunkIndex.value / dataChunks.value.length) * 100)
    })
  }
}
