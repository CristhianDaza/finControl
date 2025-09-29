<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'

const props = defineProps({
  content: { type: [String, Object], default: '' },
  placement: {
    type: String,
    default: 'top',
    validator: value => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  trigger: {
    type: String,
    default: 'hover',
    validator: value => ['hover', 'click', 'focus'].includes(value)
  },
  open: {
    type: Boolean,
    default: undefined
  },
  offset: {
    type: Number,
    default: 8
  },
  withArrow: {
    type: Boolean,
    default: true
  },
  maxWidth: {
    type: [String, Number],
    default: 240
  }
})

const emit = defineEmits(['open', 'close', 'toggle'])

const isOpen = ref(false)
const triggerRef = ref(null)
const tooltipRef = ref(null)
const isMobile = ref(false)
const actualPlacement = ref(props.placement)

const isControlled = computed(() => props.open !== undefined)
const showTooltip = computed(() => isControlled.value ? props.open : isOpen.value)
const effectiveTrigger = computed(() => isMobile.value ? 'click' : props.trigger)

const maxWidthStyle = computed(() =>
  typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
)

watch(() => props.open, newVal => {
  if (isControlled.value && newVal !== isOpen.value) {
    isOpen.value = newVal
    emit('toggle', newVal)
    if (newVal) {
      emit('open')
      nextTick(updatePosition)
    } else {
      emit('close')
    }
  }
})

const detectMobile = () => {
  isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

const open = () => {
  if (!isControlled.value) {
    isOpen.value = true
  }
  emit('open')
  emit('toggle', true)
  nextTick(updatePosition)
}

const close = () => {
  if (!isControlled.value) {
    isOpen.value = false
  }
  emit('close')
  emit('toggle', false)
}

const toggle = () => {
  if (showTooltip.value) {
    close()
  } else {
    open()
  }
}

const updatePosition = () => {
  if (!triggerRef.value || !tooltipRef.value) return

  const trigger = triggerRef.value
  const tooltip = tooltipRef.value
  const triggerRect = trigger.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const viewport = { width: window.innerWidth, height: window.innerHeight }

  let top, left, placement = props.placement

  switch (placement) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - props.offset
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      if (top < 0) {
        placement = 'bottom'
        top = triggerRect.bottom + props.offset
      }
      break
    case 'bottom':
      top = triggerRect.bottom + props.offset
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      if (top + tooltipRect.height > viewport.height) {
        placement = 'top'
        top = triggerRect.top - tooltipRect.height - props.offset
      }
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.left - tooltipRect.width - props.offset
      if (left < 0) {
        placement = 'right'
        left = triggerRect.right + props.offset
      }
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
      left = triggerRect.right + props.offset
      if (left + tooltipRect.width > viewport.width) {
        placement = 'left'
        left = triggerRect.left - tooltipRect.width - props.offset
      }
      break
  }

  if (left < 8) left = 8
  if (left + tooltipRect.width > viewport.width - 8) {
    left = viewport.width - tooltipRect.width - 8
  }
  if (top < 8) top = 8
  if (top + tooltipRect.height > viewport.height - 8) {
    top = viewport.height - tooltipRect.height - 8
  }

  actualPlacement.value = placement
  tooltip.style.top = `${top}px`
  tooltip.style.left = `${left}px`
}

const handleMouseEnter = () => {
  if (effectiveTrigger.value === 'hover') open()
}

const handleMouseLeave = () => {
  if (effectiveTrigger.value === 'hover') close()
}

const handleClick = () => {
  if (effectiveTrigger.value === 'click') toggle()
}

const handleFocus = () => {
  if (effectiveTrigger.value === 'focus') open()
}

const handleBlur = () => {
  if (effectiveTrigger.value === 'focus') close()
}

const handleKeydown = event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (effectiveTrigger.value === 'focus') toggle()
  }
  if (event.key === 'Escape' && showTooltip.value) close()
}

const handleClickOutside = event => {
  if (
    !triggerRef.value?.contains(event.target) &&
    !tooltipRef.value?.contains(event.target)
  ) {
    close()
  }
}

const handleScroll = () => {
  if (showTooltip.value) close()
}

const handleResize = () => {
  if (showTooltip.value) nextTick(updatePosition)
}

onMounted(() => {
  detectMobile()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="fc-tooltip-wrapper">
    <div
      ref="triggerRef"
      class="fc-tooltip-trigger"
      :tabindex="effectiveTrigger === 'focus' ? 0 : undefined"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
    >
      <slot />
    </div>

    <Teleport to="body">
      <Transition name="fc-tooltip">
        <div
          v-if="showTooltip"
          ref="tooltipRef"
          class="fc-tooltip"
          :class="`fc-tooltip--${actualPlacement}`"
          :style="{ maxWidth: maxWidthStyle }"
          role="tooltip"
          aria-live="polite"
        >
          <div class="fc-tooltip__content">
            <slot name="content">
              {{ content }}
            </slot>
          </div>
          <div
            v-if="withArrow"
            class="fc-tooltip__arrow"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fc-tooltip-wrapper {
  display: inline-block;
}

.fc-tooltip-trigger {
  display: inline-block;
}

.fc-tooltip-trigger:focus {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 4px;
}

.fc-tooltip {
  position: fixed;
  z-index: 9999;
  background-color: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-elev-3);
  pointer-events: none;
}

.fc-tooltip__content {
  padding: 8px 12px;
  font-size: 0.875rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.fc-tooltip__arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.fc-tooltip--top .fc-tooltip__arrow {
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: var(--secondary-color);
}

.fc-tooltip--bottom .fc-tooltip__arrow {
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: var(--secondary-color);
}

.fc-tooltip--left .fc-tooltip__arrow {
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: var(--secondary-color);
}

.fc-tooltip--right .fc-tooltip__arrow {
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: var(--secondary-color);
}

.fc-tooltip-enter-active,
.fc-tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fc-tooltip-enter-from,
.fc-tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fc-tooltip-enter-to,
.fc-tooltip-leave-from {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .fc-tooltip-enter-active,
  .fc-tooltip-leave-active {
    transition: opacity 0.15s ease;
  }

  .fc-tooltip-enter-from,
  .fc-tooltip-leave-to {
    transform: none;
  }

  .fc-tooltip-enter-to,
  .fc-tooltip-leave-from {
    transform: none;
  }
}
</style>
