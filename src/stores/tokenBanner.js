import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTokenBannerStore = defineStore('tokenBanner', () => {
  const lastDismissedDate = ref(localStorage.getItem('tokenBanner_lastDismissed'))
  const hasBeenShown = ref(localStorage.getItem('tokenBanner_hasBeenShown') === 'true')
  
  const shouldShowBanner = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    
    if (!hasBeenShown.value) {
      return true
    }
    
    if (lastDismissedDate.value) {
      const dismissedDate = new Date(lastDismissedDate.value)
      const todayDate = new Date(today)
      
      const dismissedDateStr = dismissedDate.toISOString().split('T')[0]
      
      if (dismissedDateStr < today) {
        return true
      }
    }
    return false
  })
  
  function dismissBanner() {
    const today = new Date().toISOString().split('T')[0]
    lastDismissedDate.value = today
    localStorage.setItem('tokenBanner_lastDismissed', today)
  }
  
  function markAsShown() {
    hasBeenShown.value = true
    localStorage.setItem('tokenBanner_hasBeenShown', 'true')
    const today = new Date().toISOString().split('T')[0]
    lastDismissedDate.value = today
    localStorage.setItem('tokenBanner_lastDismissed', today)
  }
  
  function resetBannerState() {
    hasBeenShown.value = false
    lastDismissedDate.value = null
    localStorage.removeItem('tokenBanner_hasBeenShown')
    localStorage.removeItem('tokenBanner_lastDismissed')
  }
  
  return {
    shouldShowBanner,
    dismissBanner,
    markAsShown,
    resetBannerState
  }
})
