import { ref, onMounted, onUnmounted } from 'vue'

export const useIsMobile = (breakpoint = 768) => {
  const isMobile = ref(false)

  const checkIsMobile = () => {
    isMobile.value = window.innerWidth <= breakpoint
  }

  onMounted(() => {
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkIsMobile)
  })

  return { isMobile }
}
