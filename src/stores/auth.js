import { defineStore } from 'pinia'
import { onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/services/firebase.js'
import { useAuth } from '@/composables/useAuth.js'
import { useSettingsStore } from '@/stores/settings.js'
import { doc, getDoc, updateDoc, serverTimestamp, runTransaction, setDoc, Timestamp } from 'firebase/firestore'
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
    isReadOnly: false,
  }),
  getters: {
    isAuthenticated: s => !!s.user,
    isAdmin: s => {
      const envAdmins = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(v=>v.trim()).filter(Boolean)
      return !!s.profile && (s.profile.role === 'admin' || envAdmins.includes(s.user?.uid || ''))
    },
    canWrite: s => !s.isReadOnly,
  },
  actions: {
    computeReadOnly() {
      if (!this.profile) { this.isReadOnly = false; return }
      const isActive = this.profile.isActive !== false
      const exp = this.profile.planExpiresAt?.toMillis ? this.profile.planExpiresAt.toMillis() : this.profile.planExpiresAt
      const now = Date.now()
      const expired = exp ? now >= exp : false
      this.isReadOnly = !isActive || expired
    },
    async ensureUserDoc() {
      if (!this.user) return
      const ref = doc(db, 'users', this.user.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, { email: this.user.email?.toLowerCase() || '', createdAt: serverTimestamp(), lastActiveAt: serverTimestamp(), isActive: true, role: 'user' })
      }
    },
    async initSessionListener() {
      if (this._initPromise) return this._initPromise
      const { onAuthReady } = useAuth()
      this._initPromise = new Promise((resolve) => {
        if (!this._listenerAttached) {
          this._listenerAttached = true
          this._unsub = onAuthStateChanged(auth, async (user) => {
            this.user = user
            this.status = user ? 'authenticated' : 'unauthenticated'
            if (user) {
              await this.ensureUserDoc();
              await this.fetchUserProfile();
            }
          })
        }
        onAuthReady().then(async (user) => {
          this.user = user
          this.status = user ? 'authenticated' : 'unauthenticated'
          if (user) {
            await this.ensureUserDoc();
            await this.fetchUserProfile();
          }
          resolve()
        })
      })
      return this._initPromise
    },
    async fetchUserProfile() {
      if (!this.user) { this.profile = null; this.isReadOnly = false; return }
      const ref = doc(db, 'users', this.user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) this.profile = { id: snap.id, ...snap.data() }
      else this.profile = null
      this.computeReadOnly()
    },
    async login(email, password) {
      const { loginWithEmail, toFriendlyError } = useAuth()
      this.error = null
      this.status = 'loading'
      try {
        await loginWithEmail(email, password)
        await this.fetchUserProfile()
        if (this.user && !this.isReadOnly) {
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
          const plan = fd.plan || 'monthly'
          const addDays = plan === 'annual' ? 365 : plan === 'semiannual' ? 182 : 30
          const nowMs = Date.now()
          const planExpiresAt = Timestamp.fromMillis(nowMs + addDays*24*60*60*1000)
          trx.update(codeRef, { status: 'used', usedBy: cred.user.uid, usedAt: serverTimestamp() })
          trx.set(doc(db, 'users', cred.user.uid), { email: email.toLowerCase(), createdAt: serverTimestamp(), lastActiveAt: serverTimestamp(), isActive: true, role: 'user', planExpiresAt })
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
    async touchLastActive() {
      if (!this.user || this.isReadOnly) return
      try { await updateDoc(doc(db, 'users', this.user.uid), { lastActiveAt: serverTimestamp() }) } catch {}
    },
    async logout() {
      const { logout } = useAuth()
      try { await logout() } finally {
        try { useSettingsStore().clearCacheOnLogout() } catch {}
        this.user = null
        this.profile = null
        this.status = 'unauthenticated'
        this.error = null
        this.isReadOnly = false
      }
    },
    async redeemCode(raw) {
      if (!this.user) return { ok:false, error: t('errors.generic') }
      const codeId = String(raw||'').trim().toUpperCase()
      if (!codeId) return { ok:false, error: t('validation.required') }
      const codeRef = doc(db,'inviteCodes', codeId)
      const userRef = doc(db,'users', this.user.uid)
      try {
        const result = await runTransaction(db, async (trx) => {
          const userSnap = await trx.get(userRef)
          if (!userSnap.exists()) throw new Error('user-missing')
          const userData = userSnap.data()
          const now = Date.now()
          const blockedUntilMs = userData.codeRedeemBlockedUntil?.toMillis ? userData.codeRedeemBlockedUntil.toMillis() : userData.codeRedeemBlockedUntil
          if (blockedUntilMs && now < blockedUntilMs) throw new Error('blocked|0|'+blockedUntilMs)
          const codeSnap = await trx.get(codeRef)
          const fail = async (reasonKey) => {
            const attemptsPrev = Number(userData.codeRedeemAttempts||0)
            const attemptsNew = attemptsPrev + 1
            const updates = { codeRedeemAttempts: attemptsNew }
            let blocked = ''
            if (attemptsNew >= 5) { const until = now + 24*60*60*1000; updates.codeRedeemBlockedUntil = Timestamp.fromMillis(until); blocked = String(until) }
            trx.update(userRef, updates)
            const attemptsLeft = Math.max(0, 5 - attemptsNew)
            throw new Error(reasonKey + '|' + attemptsLeft + '|' + blocked)
          }
          if (!codeSnap.exists()) await fail('not_found')
          const cd = codeSnap.data()
          if (cd.status !== 'unused') await fail(cd.status === 'used' ? 'used' : 'invalid')
          const exp1 = cd.expiresAt?.toMillis ? cd.expiresAt.toMillis() : cd.expiresAt
          const exp2 = cd.graceExpiresAt?.toMillis ? cd.graceExpiresAt.toMillis() : cd.graceExpiresAt
          if (now >= Math.min(exp1 || 0, exp2 || 0)) await fail('expired')
          const plan = cd.plan || 'monthly'
          const addDays = plan === 'annual' ? 365 : plan === 'semiannual' ? 182 : 30
          const base = (() => { const cur = userData.planExpiresAt?.toMillis ? userData.planExpiresAt.toMillis() : userData.planExpiresAt; return (cur && cur > now) ? cur : now })()
          const newExp = Timestamp.fromMillis(base + addDays*24*60*60*1000)
          trx.update(codeRef, { status: 'used', usedBy: this.user.uid, usedAt: serverTimestamp() })
          trx.update(userRef, { isActive: true, planExpiresAt: newExp, lastActiveAt: serverTimestamp(), codeRedeemAttempts: 0, codeRedeemBlockedUntil: null })
          return { ok:true, plan, newExp }
        })
        await this.fetchUserProfile()
        return { ok:true, plan: result.plan, newExp: result.newExp }
      } catch (e) {
        const msg = (e && e.message) || ''
        const [code, attemptsLeftStr='', blockedUntilStr=''] = msg.split('|')
        if (code === 'blocked') {
          const until = Number(blockedUntilStr)||0
            return { ok:false, error: t('errors.invite.blocked', { date: until ? new Date(until).toLocaleString() : '' }), attemptsLeft: 0, blockedUntil: until }
        }
        const map = { not_found: t('errors.invite.not_found'), used: t('errors.invite.used'), expired: t('errors.invite.expired'), invalid: t('errors.invite.invalid') }
        const attemptsLeft = attemptsLeftStr ? Number(attemptsLeftStr) : undefined
        const blockedUntil = blockedUntilStr ? Number(blockedUntilStr) : undefined
        return { ok:false, error: map[code] || t('errors.invite.invalid'), attemptsLeft, blockedUntil }
      }
    },
  },
})
