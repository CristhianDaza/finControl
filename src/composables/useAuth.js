import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/services/firebase.js'

const toFriendlyError = (err) => {
  const code = typeof err === 'object' && err && 'code' in err ? /** @type {{code?: string}} */(err).code : ''
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo no es válido.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciales incorrectas.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde.'
    default:
      return 'No pudimos iniciar sesión. Intenta de nuevo.'
  }
}

let readyPromise /** @type {Promise<import('firebase/auth').User|null> | null} */ = null

export const useAuth = () => {
  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const onAuthReady = () => {
    if (!readyPromise) {
      readyPromise = new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          resolve(user)
          unsub()
        })
      })
    }
    return readyPromise
  }

  return { loginWithEmail, logout, onAuthReady, toFriendlyError }
}

