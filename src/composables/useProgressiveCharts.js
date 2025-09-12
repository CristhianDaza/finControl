import { ref, computed, watch, nextTick } from 'vue'
import { useLazyCharts } from '@/composables/useLazyCharts.js'

export const useProgressiveCharts = () => {
  const { isChartVisible, isChartLoaded, chartContainer, loadChart } = useLazyCharts()
  
  // Progressive data loading states
  const isDataProcessing = ref(false)
  const processedData = ref(null)
  const dataChunks = ref([])
  const currentChunkIndex = ref(0)
  
  // Optimize large datasets by chunking
  const processDataInChunks = async (rawData, chunkSize = 100) => {
    if (!rawData || rawData.length === 0) return []
    
    isDataProcessing.value = true
    const chunks = []
    
    for (let i = 0; i < rawData.length; i += chunkSize) {
      chunks.push(rawData.slice(i, i + chunkSize))
    }
    
    dataChunks.value = chunks
    currentChunkIndex.value = 0
    
    // Process first chunk immediately
    if (chunks.length > 0) {
      processedData.value = await processChunk(chunks[0])
      currentChunkIndex.value = 1
    }
    
    // Process remaining chunks progressively
    if (chunks.length > 1) {
      await processRemainingChunks()
    }
    
    isDataProcessing.value = false
    return processedData.value
  }
  
  // Process a single chunk of data
  const processChunk = async (chunk) => {
    return new Promise((resolve) => {
      // Use requestIdleCallback for non-blocking processing
      const processInIdle = (deadline) => {
        const processed = chunk.map(item => ({
          ...item,
          // Add any data transformations here
          processedAt: Date.now()
        }))
        
        resolve(processed)
      }
      
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processInIdle)
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => processInIdle({ timeRemaining: () => 50 }), 0)
      }
    })
  }
  
  // Process remaining chunks progressively
  const processRemainingChunks = async () => {
    for (let i = currentChunkIndex.value; i < dataChunks.value.length; i++) {
      await nextTick() // Allow UI updates between chunks
      
      const chunkData = await processChunk(dataChunks.value[i])
      processedData.value = [...(processedData.value || []), ...chunkData]
      currentChunkIndex.value = i + 1
      
      // Add small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  const memoizedChartData = computed(() => {
   return null
  })
  
  let updateTimeout = null
  const debouncedUpdate = (newData, delay = 300) => {
    clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      processDataInChunks(newData)
    }, delay)
  }
  
  // Watch for chart visibility and load accordingly
  watch(isChartVisible, async (visible) => {
    if (visible && !isChartLoaded.value) {
      await loadChart()
    }
  })
  
  // Cleanup function
  const cleanup = () => {
    clearTimeout(updateTimeout)
    processedData.value = null
    dataChunks.value = []
    currentChunkIndex.value = 0
  }
  
  return {
    // Lazy loading
    isChartVisible,
    isChartLoaded,
    chartContainer,
    loadChart,
    
    // Progressive processing
    isDataProcessing,
    processedData,
    memoizedChartData,
    processDataInChunks,
    debouncedUpdate,
    cleanup,
    
    // Progress tracking
    processingProgress: computed(() => {
      if (dataChunks.value.length === 0) return 100
      return Math.round((currentChunkIndex.value / dataChunks.value.length) * 100)
    })
  }
}
