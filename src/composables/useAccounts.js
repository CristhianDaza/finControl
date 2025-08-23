import { auth, db } from '@/services/firebase.js'
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useTransactions } from '@/composables/useTransactions.js'

export const useAccounts = () => {
  const getUserCol = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return { col: collection(db, 'users', uid, 'accounts'), uid }
  }

  const subscribeAccounts = (cb) => {
    const { col } = getUserCol()
    const q = query(col)
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      cb(items)
    })
  }

  const fetchAccounts = async () => {
    return new Promise((resolve, reject) => {
      try {
        const unsub = subscribeAccounts(list => { unsub(); resolve(list) })
      } catch (e) { reject(e) }
    })
  }

  const createAccount = async ({ name, balance, currency = 'COP' }) => {
    const { col, uid } = getUserCol()
    const data = {
      ownerId: uid,
      name: String(name || '').trim(),
      balance: Math.max(0, Number(balance || 0)),
      currency: currency || 'COP',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (!data.name) throw new Error('Nombre requerido')
    if (data.balance < 0) throw new Error('Saldo inválido')
    const ref = await addDoc(col, data)
    return ref.id
  }

  const updateAccountName = async (id, name) => {
    const { col } = getUserCol()
    const ref = doc(col, id)
    const patch = { name: String(name || '').trim(), updatedAt: serverTimestamp() }
    if (!patch.name) throw new Error('Nombre requerido')
    await updateDoc(ref, patch)
  }

  const deleteAccount = async (id) => {
    const { col, uid } = getUserCol()
    const txCol = collection(db, 'users', uid, 'transactions')
    const qs = await getDocs(query(txCol, where('accountId', '==', id)))
    if (!qs.empty) {
      const err = new Error('Cuenta tiene transacciones')
      err.code = 'account/has-transactions'
      throw err
    }
    const ref = doc(col, id)
    await deleteDoc(ref)
  }

  const setBalance = async (id, balance) => {
    const { col } = getUserCol()
    const accRef = doc(col, id)
    const { getDoc } = await import('firebase/firestore')
    const snap = await getDoc(accRef)
    if (!snap.exists()) throw new Error('AccountNotFound')
    const data = snap.data()
    const current = Number(data.balance || 0)
    const target = Number(balance)
    if (isNaN(target)) throw new Error('InvalidAmount')
    const diff = target - current
    if (Math.abs(diff) < 0.000001) return
    const type = diff > 0 ? 'income' : 'expense'
    const { createTransaction } = useTransactions()
    await createTransaction({ type, amount: Math.abs(diff), accountId: id, date: new Date().toISOString().slice(0,10), note: 'Reconciliación' })
  }

  return { subscribeAccounts, fetchAccounts, createAccount, updateAccountName, deleteAccount, setBalance }
}
