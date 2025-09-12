import { ref, onMounted, onUnmounted, nextTick } from 'vue'

export const useLazyCharts = () => {
  const isChartVisible = ref(false)
  const isChartLoaded = ref(false)
  const chartContainer = ref(null)
  const observer = ref(null)

  // Intersection Observer for lazy loading charts
  const createObserver = () => {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      // Fallback for environments without IntersectionObserver
      isChartVisible.value = true
      return
    }

    observer.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isChartLoaded.value) {
            isChartVisible.value = true
            loadChart()
          }
        })
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before the chart comes into view
        threshold: 0.1
      }
    )

    if (chartContainer.value) {
      observer.value.observe(chartContainer.value)
    }
  }

  // Lazy load Chart.js components
  const loadChart = async () => {
    if (isChartLoaded.value) return

    try {
      // Dynamic import of Chart.js components
      const { useCharts } = await import('@/composables/useCharts.js')
      const { registerChartComponents } = useCharts()
      
      // Register components only when needed
      registerChartComponents()
      
      isChartLoaded.value = true
      
      // Small delay to ensure smooth rendering
      await nextTick()
    } catch (error) {
      console.error('Failed to load chart components:', error)
    }
  }

  // Preload charts on user interaction
  const preloadOnInteraction = () => {
    const events = ['mouseenter', 'touchstart', 'focus']
    
    const handleInteraction = () => {
      loadChart()
      // Remove listeners after first interaction
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction, { passive: true })
      })
    }

    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true })
    })
  }

  onMounted(() => {
    createObserver()
    preloadOnInteraction()
  })

  onUnmounted(() => {
    if (observer.value) {
      observer.value.disconnect()
    }
  })

  return {
    isChartVisible,
    isChartLoaded,
    chartContainer,
    loadChart
  }
}
