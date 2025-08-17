import { defineStore } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase.js'
import { useAuth } from '@/composables/useAuth.js'
import { useSettingsStore } from '@/stores/settings.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: /** @type {any} */(null),
    status: 'idle',
    error: null,
    _listenerAttached: false,
    _initPromise: null,
    _unsub: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
  },
  actions: {
    async initSessionListener() {
      if (this._initPromise) return this._initPromise
      const { onAuthReady } = useAuth()

      this._initPromise = new Promise((resolve) => {
        if (!this._listenerAttached) {
          this._listenerAttached = true
          this._unsub = onAuthStateChanged(auth, (user) => {
            this.user = user
            this.status = user ? 'authenticated' : 'unauthenticated'
          })
        }
        onAuthReady().then((user) => {
          this.user = user
          this.status = user ? 'authenticated' : 'unauthenticated'
          resolve()
        })
      })

      return this._initPromise
    },
    
    async login(email, password) {
      const { loginWithEmail, toFriendlyError } = useAuth()
      this.error = null
      this.status = 'loading'
      try {
        await loginWithEmail(email, password)
        this.status = 'authenticated'
        return true
      } catch (err) {
        this.error = toFriendlyError(err)
        this.status = 'unauthenticated'
        return false
      }
    },
    
    async logout() {
      const { logout } = useAuth()
      try {
        await logout()
      } finally {
        // limpiar tema local y revertir a defaults
        try { useSettingsStore().clearCacheOnLogout() } catch {}
        this.user = null
        this.status = 'unauthenticated'
        this.error = null
      }
    },
  },
})
