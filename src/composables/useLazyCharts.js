import { ref, onMounted, onUnmounted, nextTick } from 'vue'

export const useLazyCharts = () => {
  const isChartVisible = ref(false)
  const isChartLoaded = ref(false)
  const chartContainer = ref(null)
  const observer = ref(null)

  const createObserver = () => {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      isChartVisible.value = true
      return
    }

    observer.value = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !isChartLoaded.value) {
            isChartVisible.value = true
            loadChart()
          }
        })
      },
      {
        root: null,
        rootMargin: '50px', // Comienza a cargar 50px antes de que el gráfico sea visible
        threshold: 0.1
      }
    )

    if (chartContainer.value) {
      observer.value.observe(chartContainer.value)
    }
  }

  const loadChart = async () => {
    if (isChartLoaded.value) return

    try {
      const { useCharts } = await import('@/composables/useCharts.js')
      const { registerChartComponents } = useCharts()
      
      registerChartComponents()
      
      isChartLoaded.value = true
      
      await nextTick()
    } catch (error) {
      console.error('Fallo al cargar componentes de gráfico:', error)
    }
  }

  const preloadOnInteraction = () => {
    const events = ['mouseenter', 'touchstart', 'focus']
    
    const handleInteraction = () => {
      loadChart()
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
