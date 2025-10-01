import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEYS = {
  hash: 'inactivityLock.hash',
  minutes: 'inactivityLock.minutes',
  isLocked: 'inactivityLock.isLocked'
}

export const useInactivityLockStore = defineStore('inactivityLock', () => {
  const isLocked = ref(false)
  const pinHash = ref(null)
  const timeoutMinutes = ref(0) // 0 = disabled, 5, 10, 30
  const failedAttempts = ref(0)
  const lockoutUntil = ref(null)
  const isConfigured = computed(() => !!pinHash.value)
  const isEnabled = computed(() => isConfigured.value && timeoutMinutes.value > 0)
  
  function initialize() {
    const storedHash = localStorage.getItem(STORAGE_KEYS.hash)
    const storedMinutes = localStorage.getItem(STORAGE_KEYS.minutes)
    const storedLocked = localStorage.getItem(STORAGE_KEYS.isLocked)
    
    if (storedHash) pinHash.value = storedHash
    if (storedMinutes) timeoutMinutes.value = parseInt(storedMinutes, 10)
    if (storedLocked === 'true') isLocked.value = true

    failedAttempts.value = 0
    lockoutUntil.value = null
  }
  
  function setPin(hash) {
    pinHash.value = hash
    localStorage.setItem(STORAGE_KEYS.hash, hash)
  }

  function setTimeoutMinutes(minutes) {
    timeoutMinutes.value = minutes
    localStorage.setItem(STORAGE_KEYS.minutes, minutes.toString())
  }
  
  function lock() {
    if (!isEnabled.value) return
    isLocked.value = true
    localStorage.setItem(STORAGE_KEYS.isLocked, 'true')
  }
  
  function unlock() {
    isLocked.value = false
    failedAttempts.value = 0
    lockoutUntil.value = null
    localStorage.removeItem(STORAGE_KEYS.isLocked)
  }
  
  function recordFailedAttempt() {
    failedAttempts.value++
    if (failedAttempts.value >= 3) {
      lockoutUntil.value = Date.now() + (30 * 1000) // 30 seconds lockout
    }
  }
  
  function isInLockout() {
    if (!lockoutUntil.value) return false
    if (Date.now() < lockoutUntil.value) return true
    
    lockoutUntil.value = null
    failedAttempts.value = 0
    return false
  }
  
  function clearPin() {
    pinHash.value = null
    timeoutMinutes.value = 0
    unlock()
    localStorage.removeItem(STORAGE_KEYS.hash)
    localStorage.removeItem(STORAGE_KEYS.minutes)
  }
  
  function getLockoutRemaining() {
    if (!lockoutUntil.value) return 0
    return Math.max(0, Math.ceil((lockoutUntil.value - Date.now()) / 1000))
  }
  
  return {
    isLocked,
    pinHash,
    timeoutMinutes,
    failedAttempts,
    lockoutUntil,
    isConfigured,
    isEnabled,
    initialize,
    setPin,
    setTimeoutMinutes,
    lock,
    unlock,
    recordFailedAttempt,
    isInLockout,
    clearPin,
    getLockoutRemaining
  }
})
