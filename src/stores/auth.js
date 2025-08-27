import { defineStore } from 'pinia'
import { onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/services/firebase.js'
import { useAuth } from '@/composables/useAuth.js'
import { useSettingsStore } from '@/stores/settings.js'
import { doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { t } from '@/i18n/index.js'
import { useNotify } from '@/components/global/fcNotify.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: /** @type {any} */(null),
    profile: null,
    status: 'idle',
    error: null,
    _listenerAttached: false,
    _initPromise: null,
    _unsub: null,
  }),
  getters: {
    isAuthenticated: s => !!s.user,
    isAdmin: s => {
      const envAdmins = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(v=>v.trim()).filter(Boolean)
      return !!s.profile && (s.profile.role === 'admin' || envAdmins.includes(s.user?.uid || ''))
    },
  },
  actions: {
    async initSessionListener() {
      if (this._initPromise) return this._initPromise
      const { onAuthReady } = useAuth()
      this._initPromise = new Promise((resolve) => {
        if (!this._listenerAttached) {
          this._listenerAttached = true
          this._unsub = onAuthStateChanged(auth, async (user) => {
            this.user = user
            this.status = user ? 'authenticated' : 'unauthenticated'
            if (user) await this.fetchUserProfile()
          })
        }
        onAuthReady().then(async (user) => {
          this.user = user
          this.status = user ? 'authenticated' : 'unauthenticated'
            if (user) await this.fetchUserProfile()
          resolve()
        })
      })
      return this._initPromise
    },
    async fetchUserProfile() {
      if (!this.user) { this.profile = null; return }
      const ref = doc(db, 'users', this.user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) this.profile = { id: snap.id, ...snap.data() }
      else this.profile = null
    },
    async login(email, password) {
      const { loginWithEmail, toFriendlyError } = useAuth()
      this.error = null
      this.status = 'loading'
      try {
        await loginWithEmail(email, password)
        await this.fetchUserProfile()
        if (this.user) {
          try { await updateDoc(doc(db, 'users', this.user.uid), { lastActiveAt: serverTimestamp() }) } catch {}
        }
        this.status = 'authenticated'
        return true
      } catch (err) {
        this.error = toFriendlyError(err)
        this.status = 'unauthenticated'
        return false
      }
    },
    async signup(email, password, code, confirmPassword) {
      const notify = useNotify()
      this.error = null
      if (password !== confirmPassword) { this.error = t('errors.signup.password_mismatch'); return false }
      this.status = 'loading'
      try {
        const codeId = code.trim().toUpperCase()
        const codeRef = doc(db, 'inviteCodes', codeId)
        const snap = await getDoc(codeRef)
        if (!snap.exists()) { this.error = t('errors.invite.not_found'); this.status='unauthenticated'; return false }
        const data = snap.data()
        const now = Date.now()
        const exp1 = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt
        const exp2 = data.graceExpiresAt?.toMillis ? data.graceExpiresAt.toMillis() : data.graceExpiresAt
        if (data.status !== 'unused') { this.error = t('errors.invite.used'); this.status='unauthenticated'; return false }
        if (now >= Math.min(exp1 || now-1, exp2 || now-1)) { this.error = t('errors.invite.expired'); this.status='unauthenticated'; return false }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await runTransaction(db, async (trx) => {
          const fresh = await trx.get(codeRef)
          if (!fresh.exists()) throw new Error('missing')
          const fd = fresh.data()
          if (fd.status !== 'unused') throw new Error('used')
          const expA = fd.expiresAt?.toMillis ? fd.expiresAt.toMillis() : fd.expiresAt
          const expB = fd.graceExpiresAt?.toMillis ? fd.graceExpiresAt.toMillis() : fd.graceExpiresAt
          if (Date.now() >= Math.min(expA || 0, expB || 0)) throw new Error('expired')
          trx.update(codeRef, { status: 'used', usedBy: cred.user.uid, usedAt: serverTimestamp() })
          trx.set(doc(db, 'users', cred.user.uid), { email: email.toLowerCase(), createdAt: serverTimestamp(), lastActiveAt: serverTimestamp(), isActive: true, role: 'user' })
        })
        await this.fetchUserProfile()
        this.status = 'authenticated'
        notify.success(t('auth.signup.success'))
        return true
      } catch (e) {
        const msg = (e && e.message) || ''
        if (msg === 'used') this.error = t('errors.invite.used')
        else if (msg === 'expired') this.error = t('errors.invite.expired')
        else this.error = t('errors.invite.invalid')
        this.status = 'unauthenticated'
        return false
      }
    },
    async logout() {
      const { logout } = useAuth()
      try { await logout() } finally {
        try { useSettingsStore().clearCacheOnLogout() } catch {}
        this.user = null
        this.profile = null
        this.status = 'unauthenticated'
        this.error = null
      }
    },
  },
})
