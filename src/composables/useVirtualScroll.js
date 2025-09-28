import { ref, computed, onMounted, onUnmounted, nextTick, watchEffect } from 'vue'

export const useVirtualScroll = (options = {}) => {
  const {
    itemHeight = 60,
    containerHeight = 400,
    overscan = 5,
    threshold = 0.1
  } = options

  const containerRef = ref(null)
  const scrollTop = ref(0)
  const containerSize = ref(containerHeight)
  const items = ref([])
  const isScrolling = ref(false)

  let scrollTimeout = null

  const visibleStartIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  )

  const visibleEndIndex = computed(() => {
    const visibleCount = Math.ceil(containerSize.value / itemHeight)
    return Math.min(
      items.value.length - 1,
      visibleStartIndex.value + visibleCount + overscan * 2
    )
  })

  const visibleItems = computed(() =>
    items.value.slice(visibleStartIndex.value, visibleEndIndex.value + 1)
  )

  const totalHeight = computed(() =>
    items.value.length * itemHeight
  )

  const offsetY = computed(() =>
    visibleStartIndex.value * itemHeight
  )

  const virtualizedItemsCount = computed(() =>
    visibleEndIndex.value - visibleStartIndex.value + 1
  )

  const renderRatio = computed(() => {
    if (items.value.length === 0) return 0
    return Math.round((virtualizedItemsCount.value / items.value.length) * 100)
  })

  let intersectionObserver = null

  const setupIntersectionObserver = () => {
    if (!containerRef.value || !window.IntersectionObserver) return

    intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            enableScrollTracking()
          } else {
            disableScrollTracking()
          }
        })
      },
      { threshold }
    )

    intersectionObserver.observe(containerRef.value)
  }

  let scrollTrackingEnabled = true

  const enableScrollTracking = () => {
    scrollTrackingEnabled = true
  }

  const disableScrollTracking = () => {
    scrollTrackingEnabled = false
  }

  const handleScroll = event => {
    if (!scrollTrackingEnabled) return

    const target = event.target
    scrollTop.value = target.scrollTop

    isScrolling.value = true
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      isScrolling.value = false
    }, 150)

    if (target.clientHeight !== containerSize.value) {
      containerSize.value = target.clientHeight
    }
  }

  let rafId = null

  const optimizedScrollHandler = event => {
    if (rafId) return

    rafId = requestAnimationFrame(() => {
      handleScroll(event)
      rafId = null
    })
  }

  const setItems = newItems => {
    items.value = newItems || []
  }

  const scrollToIndex = (index, behavior = 'smooth') => {
    if (!containerRef.value || index < 0 || index >= items.value.length) return

    const targetScrollTop = index * itemHeight
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior
    })
  }

  const scrollToTop = (behavior = 'smooth') => {
    scrollToIndex(0, behavior)
  }

  const scrollToBottom = (behavior = 'smooth') => {
    scrollToIndex(items.value.length - 1, behavior)
  }

  let resizeObserver = null

  const setupResizeObserver = () => {
    if (!containerRef.value || !window.ResizeObserver) return

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { height } = entry.contentRect
        if (height !== containerSize.value) {
          containerSize.value = height
        }
      }
    })

    resizeObserver.observe(containerRef.value)
  }

  onMounted(async () => {
    await nextTick()
    if (containerRef.value) {
      containerSize.value = containerRef.value.clientHeight || containerHeight
      setupIntersectionObserver()
      setupResizeObserver()
    }
  })

  onUnmounted(() => {
    clearTimeout(scrollTimeout)
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    if (intersectionObserver) {
      intersectionObserver.disconnect()
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  watchEffect(() => {
    if (items.value.length === 0) {
      scrollTop.value = 0
    }
  })

  return {
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
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    handleScroll: optimizedScrollHandler,
    scrollTop: computed(() => scrollTop.value),
    containerSize: computed(() => containerSize.value),
    itemsCount: computed(() => items.value.length)
  }
}

export const useVirtualTable = (options = {}) => {
  const virtualScroll = useVirtualScroll({
    itemHeight: 60,
    containerHeight: 500,
    overscan: 3,
    ...options
  })

  return {
    ...virtualScroll,
    tableStyle: computed(() => ({
      height: `${virtualScroll.totalHeight.value}px`,
      position: 'relative'
    })),
    visibleRowsStyle: computed(() => ({
      transform: `translateY(${virtualScroll.offsetY.value}px)`,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    }))
  }
}

export const useVirtualGrid = (options = {}) => {
  const virtualScroll = useVirtualScroll({
    itemHeight: 120,
    containerHeight: 600,
    overscan: 2,
    ...options
  })

  return {
    ...virtualScroll,
    gridStyle: computed(() => ({
      height: `${virtualScroll.totalHeight.value}px`,
      position: 'relative'
    })),
    visibleCardsStyle: computed(() => ({
      transform: `translateY(${virtualScroll.offsetY.value}px)`,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }))
  }
}
