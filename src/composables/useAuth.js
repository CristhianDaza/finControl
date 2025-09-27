import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/services/firebase.js'
import { t } from '@/i18n/index.js'

const toFriendlyError = (err) => {
  const code = (typeof err === 'object' && err && 'code' in err) ? err.code : ''
  switch (code) {
    case 'auth/invalid-email':
      return t('errors.auth.invalid-email')
    case 'auth/user-not-found':
      return t('errors.auth.user-not-found')
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('errors.auth.invalid-credential')
    case 'auth/too-many-requests':
      return t('errors.auth.too-many-requests')
    default:
      return t('errors.auth.generic')
  }
}

export const useAuth = () => {
  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const onAuthReady = () => {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        resolve(user)
        try { unsub() } catch {}
      })
    })
  }

  return { loginWithEmail, logout, onAuthReady, toFriendlyError }
}
