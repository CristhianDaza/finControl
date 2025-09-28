<script setup>
import { ref, computed } from 'vue'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

const { state, remove } = useNotify()
const toasts = computed(() => state.toasts)

const roleFor = type => type === 'error' ? 'alert' : 'status'
const liveFor = type => type === 'error' ? 'assertive' : 'polite'

const drags = ref({})
const THRESHOLD_REMOVE = 120
const MAX_SWAY = 500

const onPointerDown = (e, id) => {
  const el = e.currentTarget
  try { el.setPointerCapture?.(e.pointerId) } catch {}
  drags.value[id] = {
    startX: e.clientX,
    startY: e.clientY,
    x: 0,
    active: true
  }
  el.style.willChange = 'transform, opacity'
}

const onPointerMove = (e, id) => {
  const d = drags.value[id]
  if (!d || !d.active) return
  d.x = e.clientX - d.startX

  const el = e.currentTarget
  const progress = Math.min(Math.abs(d.x) / THRESHOLD_REMOVE, 1)
  const rot = d.x * 0.02

  el.style.transition = 'transform 0s, opacity 0s'
  el.style.transform = `translateX(${d.x}px) rotate(${rot}deg)`
  el.style.opacity = String(1 - progress * 0.35)
}

const finish = (el, id, shouldRemove) => {
  el.style.transition = 'transform .18s ease, opacity .18s ease'
  if (shouldRemove) {
    const dir = drags.value[id]?.x > 0 ? 1 : -1
    el.style.transform = `translateX(${dir * MAX_SWAY}px) rotate(${dir * 8}deg)`
    el.style.opacity = '0'
    setTimeout(() => remove(id), 160)
  } else {
    el.style.transform = 'translateX(0) rotate(0)'
    el.style.opacity = '1'
    setTimeout(() => {
      el.style.willChange = ''
      el.style.transition = ''
    }, 200)
  }
  delete drags.value[id]
}

const onPointerUp = (e, id) => {
  const el = e.currentTarget
  const d = drags.value[id]
  if (!d) return
  const shouldRemove = Math.abs(d.x) > THRESHOLD_REMOVE
  finish(el, id, shouldRemove)
}

const onPointerCancel = (e, id) => {
  const el = e.currentTarget
  if (!drags.value[id]) return
  finish(el, id, false)
}
</script>

<template>
  <teleport to="body">
    <div class="fc-notify" aria-live="polite" aria-atomic="false">
      <transition-group name="toast" tag="div" class="stack">
        <div
          v-for="tst in toasts"
          :key="tst.id"
          class="toast"
          :class="tst.type"
          :role="roleFor(tst.type)"
          :aria-live="liveFor(tst.type)"
          @pointerdown="onPointerDown($event, tst.id)"
          @pointermove="onPointerMove($event, tst.id)"
          @pointerup="onPointerUp($event, tst.id)"
          @pointercancel="onPointerCancel($event, tst.id)"
        >
          <div class="toast-content">
            <span class="toast-icon" aria-hidden="true"></span>
            <p class="toast-message">{{ tst.message }}</p>
            <button
              class="toast-close"
              :aria-label="t('notification.dismiss')"
              @click="remove(tst.id)"
            >
              <span class="x" aria-hidden="true"></span>
            </button>
          </div>
          <span class="lifebar" aria-hidden="true"></span>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style scoped>
  .fc-notify {
    position: fixed;
    inset: 16px 16px auto auto;
    z-index: 11000;
    pointer-events: none;
    max-width: min(92vw, 420px);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  @media (max-width: 680px) {
    .fc-notify {
      inset: auto 12px 14px 12px;
      display: grid;
      place-items: center;
      max-width: unset;
    }
    .stack {
      width: clamp(280px, 92vw, 480px);
      align-items: stretch;
    }
  }

  .toast {
    pointer-events: auto;
    background: color-mix(in oklab, var(--primary-color) 86%, transparent);
    border: 1px solid color-mix(in oklab, var(--secondary-color) 78%, transparent);
    color: var(--text-color);
    border-radius: 14px;
    padding: .8rem .9rem .9rem;
    box-shadow:
      0 8px 22px rgba(0,0,0,.28),
      0 1px 0 rgba(255,255,255,.04) inset;
    backdrop-filter: blur(8px) saturate(1.05);
    -webkit-backdrop-filter: blur(8px) saturate(1.05);
    overflow: clip;
    position: relative;
    touch-action: pan-y;
    cursor: grab;
  }

  .toast:active {
    cursor: grabbing;
  }

  .toast.success {
    box-shadow: inset 3px 0 0 0 var(--success-color), 0 8px 22px rgba(0,0,0,.28);
  }
  .toast.error {
    box-shadow: inset 3px 0 0 0 var(--error-color), 0 8px 22px rgba(0,0,0,.28);
  }
  .toast.info {
    box-shadow: inset 3px 0 0 0 var(--info-color), 0 8px 22px rgba(0,0,0,.28);
  }
  .toast.warn {
    box-shadow: inset 3px 0 0 0 var(--warning-color), 0 8px 22px rgba(0,0,0,.28);
  }

  .toast-content {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: .65rem;
    align-items: center;
  }

  .toast-message {
    margin: 0;
    line-height: 1.28;
    font-size: .95rem;
    word-break: break-word;
  }

  .toast-icon {
    inline-size: 20px;
    block-size: 20px;
    border-radius: 6px;
    background: currentColor;
    -webkit-mask: var(--icon) center / 18px 18px no-repeat;
    mask: var(--icon) center / 18px 18px no-repeat;
  }

  .toast.success {
    color: var(--success-color);
    --icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/></svg>");
  }
  .toast.error {
    color: var(--error-color);
    --icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M12 2 2 22h20L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z'/></svg>");
  }
  .toast.info {
    color: var(--info-color);
    --icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M11 17h2v-6h-2v6zm0-8h2V7h-2v2z'/></svg>");
  }
  .toast.warn {
    color: var(--warning-color);
    --icon: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V9h2v5z'/></svg>");
  }

  .toast-close {
    background: transparent;
    border: 0;
    color: var(--muted-text-color, #A3A8B8);
    inline-size: 32px;
    block-size: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background .15s ease, transform .1s ease, color .15s ease;
  }

  .toast-close:hover {
    background: color-mix(in oklab, var(--secondary-color) 72%, transparent);
    color: var(--text-color);
  }

  .toast-close:active {
    transform: scale(.96);
  }

  .toast-close:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }

  .toast-close .x {
    inline-size: 14px;
    block-size: 14px;
    background: currentColor;
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.59 16.89 4.29z'/></svg>") center / 14px 14px no-repeat;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23000' viewBox='0 0 24 24'><path d='M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.59 16.89 4.29z'/></svg>") center / 14px 14px no-repeat;
  }

  .lifebar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    width: 100%;
    background: color-mix(in oklab, var(--secondary-color) 70%, transparent);
    overflow: hidden;
  }

  .lifebar::before {
    content: "";
    position: absolute;
    inset: 0;
    background: currentColor;
    transform-origin: left;
    animation: lifeline 3.5s linear forwards;
    opacity: .9;
  }

  @keyframes lifeline {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }

  .toast-enter-active,
  .toast-leave-active {
    transition: opacity .18s ease, transform .18s ease, filter .18s ease;
  }

  .toast-enter-from {
    opacity: 0;
    transform: translateY(-8px) scale(.98);
    filter: blur(.5px);
  }

  .toast-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(.98);
    filter: blur(.6px);
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-enter-active,
    .toast-leave-active {
      transition: none;
    }
    .lifebar::before {
      animation: none;
    }
  }
</style>
