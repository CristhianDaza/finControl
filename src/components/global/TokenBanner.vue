<script setup>
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useTokenBannerStore } from '@/stores/tokenBanner.js'
import { t } from '@/i18n/index.js'
import FcTooltip from './FcTooltip.vue'

const auth = useAuthStore()
const bannerStore = useTokenBannerStore()

const hasActiveToken = computed(() => {
  const profile = auth.profile
  if (!profile) return false

  const expMs = profile.planExpiresAt?.toMillis
    ? profile.planExpiresAt.toMillis()
    : profile.planExpiresAt

  if (!expMs) return false

  return Date.now() < expMs
})

const shouldShowBanner = computed(() => {
  const shouldShow = bannerStore.shouldShowBanner
  const isAuth = auth.isAuthenticated
  const isReadOnly = auth.isReadOnly

  const isForced = localStorage.getItem('_forceShowTokenBanner') === 'true'
  if (isForced) {
    return shouldShow && isAuth && !isReadOnly
  }

  const userId = auth.user?.uid?.substring(0, 8) || 'none'

  return shouldShow && isAuth && !isReadOnly && !hasActiveToken.value
})

function dismissBanner() {
  bannerStore.dismissBanner()
}

function handleActivateClick() {
  bannerStore.markAsShown()
}

onMounted(() => {
  if (import.meta.env.DEV) {
    window.debugTokenBanner = () => {
      const profile = auth.profile
      let hasActiveToken = false
      let tokenDebugInfo = {}

      if (profile) {
        const expMs = profile.planExpiresAt?.toMillis
          ? profile.planExpiresAt.toMillis()
          : profile.planExpiresAt

        hasActiveToken = expMs && Date.now() < expMs

        tokenDebugInfo = {
          planExpiresAt: profile.planExpiresAt,
          planExpiresAtMs: expMs,
          currentTimeMs: Date.now(),
          hasExpirationDate: !!expMs,
          isNotExpired: expMs ? Date.now() < expMs : false,
          hasActiveToken: hasActiveToken
        }

        if (expMs) {
          const expirationDate = new Date(expMs)
          const currentDate = new Date()
          tokenDebugInfo.expirationDateFormatted = expirationDate.toISOString()
          tokenDebugInfo.currentDateFormatted = currentDate.toISOString()
          tokenDebugInfo.daysUntilExpiration = Math.floor((expMs - Date.now()) / (1000 * 60 * 60 * 24))
        }
      }

      const finalConditions = {
        shouldShow: bannerStore.shouldShowBanner,
        isAuth: auth.isAuthenticated,
        notReadOnly: !auth.isReadOnly,
        notHasActiveToken: !hasActiveToken
      }
    }

    window.resetTokenBanner = () => {
      bannerStore.resetBannerState()
      localStorage.removeItem('_forceShowTokenBanner')
      location.reload()
    }
  }
})
</script>

<template>
  <div
    v-if="shouldShowBanner"
    class="token-banner"
    role="banner"
    aria-live="polite"
  >
    <div class="banner-content">
      <div class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
          <path d="M19 15L19.31 16.32L21 16.5L19.31 16.68L19 18L18.69 16.68L17 16.5L18.69 16.32L19 15Z" fill="currentColor"/>
          <path d="M19 5L19.31 6.32L21 6.5L19.31 6.68L19 8L18.69 6.68L17 6.5L18.69 6.32L19 5Z" fill="currentColor"/>
          <path d="M5 15L5.31 16.32L7 16.5L5.31 16.68L5 18L4.69 16.68L3 16.5L4.69 16.32L5 15Z" fill="currentColor"/>
        </svg>
      </div>

      <div class="banner-text">
        <h3 class="banner-title">{{ t('tokenBanner.title') }}</h3>
        <p class="banner-message">{{ t('tokenBanner.message') }}</p>
      </div>

      <div class="banner-actions">
        <router-link
          to="/settings"
          class="banner-button banner-primary banner-compact"
          @click="handleActivateClick"
        >
          {{ t('tokenBanner.activateButton') }}
        </router-link>

        <FcTooltip :content="t('common.close')" position="bottom">
          <button
            class="banner-button banner-dismiss"
            @click="dismissBanner"
            :aria-label="t('tokenBanner.dismissButton')"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </FcTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.token-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: linear-gradient(135deg, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 85%, transparent) 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.banner-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  color: white;
  opacity: 0.9;
}

.banner-icon svg {
  width: 100%;
  height: 100%;
}

.banner-text {
  flex: 1;
  min-width: 0;
}

.banner-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
}

.banner-message {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.banner-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  min-height: 36px;
}

.banner-primary {
  background: rgba(255, 255, 255, 0.95);
  color: var(--accent-color);
  backdrop-filter: blur(4px);
}

.banner-primary:hover {
  background: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.banner-compact {
  padding: 0.375rem 0.75rem !important;
  font-size: 0.8rem !important;
  min-height: 32px !important;
}

.banner-dismiss {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0.5rem;
  backdrop-filter: blur(4px);
}

.banner-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.banner-dismiss svg {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .banner-content {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  .banner-icon {
    width: 2rem;
    height: 2rem;
  }

  .banner-title {
    font-size: 1rem;
  }

  .banner-message {
    font-size: 0.85rem;
  }

  .banner-actions {
    gap: 0.5rem;
  }

  .banner-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .banner-text {
    text-align: left;
  }

  .banner-actions {
    align-self: stretch;
    justify-content: space-between;
  }

  .banner-primary {
    flex: 1;
    text-align: center;
  }
}

.token-banner {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
