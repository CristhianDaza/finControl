<script setup>
import { computed } from 'vue'
import { useNotify } from '@/components/global/fcNotify.js'
const { state, remove } = useNotify()
const toasts = computed(()=>state.toasts)
</script>

<template>
  <teleport to="body">
    <div class="fc-notify">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" role="status" @click="remove(t.id)">
        <span>{{ t.message }}</span>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.fc-notify{position:fixed;right:16px;top:16px;display:flex;flex-direction:column;gap:8px;z-index:11000}
.toast{padding:.6rem 1rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;user-select:none}
.toast.success{background-color:var(--success-color);color:#fff}
.toast.error{background-color:var(--error-color);color:#fff}
.toast.info{background-color:var(--info-color);color:#fff}
</style>

