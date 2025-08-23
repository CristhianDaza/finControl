import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGlobalLoadingStore = defineStore('globalLoading', () => {
  const active = ref(0)
  const isLoading = computed(() => active.value > 0)

  function _inc () { active.value++ }
  function _dec () { active.value = Math.max(0, active.value - 1) }

  function wrap (promise) {
    _inc()
    return promise.finally(_dec)
  }

  return { active, isLoading, _inc, _dec, wrap }
})

