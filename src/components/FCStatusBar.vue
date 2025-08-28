<script setup>
import { computed } from 'vue'
const props = defineProps({ open: { type: Boolean, default: false }, type: { type: String, default: 'warning' }, message: { type: String, default: '' }, actionText: { type: String, default: '' }, actionHref: { type: String, default: '#' } })
const cls = computed(()=>`fc-status-bar ${props.type}`)
</script>
<template>
  <div v-if="open" :class="cls" role="status" aria-live="polite">
    <span class="msg">{{ message }}</span>
    <a v-if="actionText" :href="actionHref" class="action-link">{{ actionText }}</a>
  </div>
</template>
<style scoped>
.fc-status-bar { position: fixed; top: 0; left: 0; right: 0; width: 100%; display: flex; align-items: center; justify-content: center; gap: 1rem; padding: .5rem .75rem; font-size: .875rem; z-index: 2000; background: var(--warning-color); color: var(--black); box-shadow: 0 2px 6px var(--shadow-elev-3); }
.fc-status-bar.warning { background: linear-gradient(90deg,var(--warning-color), color-mix(in srgb,var(--warning-color) 85%, var(--black))); }
.fc-status-bar .action-link { color: var(--black); font-weight: 600; text-decoration: underline; }
.fc-status-bar .action-link:hover { text-decoration: none; }
.msg { text-align: center; }
</style>

