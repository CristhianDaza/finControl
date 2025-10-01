import { ref, onMounted, onUnmounted } from 'vue'
import { useInactivityLockStore } from '@/stores/inactivityLock.js'

export function useInactivityLock() {
  const store = useInactivityLockStore()
  const timer = ref(null)
  const lastActivity = ref(Date.now())
  
  const activityEvents = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'visibilitychange']
  
  function resetTimer() {
    if (!store.isEnabled) return
    
    lastActivity.value = Date.now()
    clearTimeout(timer.value)
    
    timer.value = setTimeout(() => {
      store.lock()
    }, store.timeoutMinutes * 60 * 1000)
  }
  
  function handleActivity() {
    if (!store.isLocked && store.isEnabled) {
      resetTimer()
    }
  }
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && store.isEnabled) {
      resetTimer()
    }
  }
  
  function startTracking() {
    if (!store.isEnabled) return
    
    activityEvents.forEach(event => {
      if (event === 'visibilitychange') {
        document.addEventListener(event, handleVisibilityChange)
      } else {
        document.addEventListener(event, handleActivity, { passive: true })
      }
    })
    
    resetTimer()
  }
  
  function stopTracking() {
    activityEvents.forEach(event => {
      if (event === 'visibilitychange') {
        document.removeEventListener(event, handleVisibilityChange)
      } else {
        document.removeEventListener(event, handleActivity)
      }
    })
    clearTimeout(timer.value)
    timer.value = null
  }
  
  onMounted(() => {
    store.initialize()
    if (store.isEnabled) {
      startTracking()
    }
  })
  
  onUnmounted(() => {
    stopTracking()
  })
  
  return {
    startTracking,
    stopTracking,
    lastActivity
  }
}
