import { auth, db } from '@/services/firebase.js'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'

export const useDebts = () => {
  const getUserCol = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return { col: collection(db, 'users', uid, 'debts'), uid, txCol: collection(db, 'users', uid, 'transactions') }
  }

  const subscribeDebts = (cb) => {
    const { col } = getUserCol()
    const q = query(col)
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      cb(items)
    })
  }

  const fetchDebts = async () => {
    return new Promise((resolve, reject) => {
      try { const unsub = subscribeDebts(list => { unsub(); resolve(list) }) } catch (e) { reject(e) }
    })
  }

  const createDebt = async ({ name, amount, dueDate, currency }) => {
    const { col, uid } = getUserCol()
    const originalAmount = Math.max(0, Number(amount || 0))
    const data = {
      ownerId: uid,
      name: String(name || '').trim(),
      originalAmount,
      remainingAmount: originalAmount,
      dueDate: dueDate || null,
      currency: currency || 'COP',
      status: originalAmount === 0 ? 'paid' : 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (!data.name) throw new Error('Nombre requerido')
    if (data.originalAmount < 0) throw new Error('Monto inválido')
    const ref = await addDoc(col, data)
    return ref.id
  }

  const updateDebt = async (id, patch) => {
    const { col } = getUserCol()
    const ref = doc(col, id)
    const data = {}
    if (patch.name != null) data.name = String(patch.name || '').trim()
    if (patch.dueDate !== undefined) data.dueDate = patch.dueDate || null
    if (patch.status) data.status = patch.status === 'paid' ? 'paid' : 'active'
    data.updatedAt = serverTimestamp()
    if (data.name != null && !data.name) throw new Error('Nombre requerido')
    await updateDoc(ref, data)
  }

  const deleteDebt = async (id) => {
    const { col, txCol } = getUserCol()
    const qs = await getDocs(query(txCol, where('type','==','debtPayment'), where('debtId','==', id)))
    if (!qs.empty) {
      const err = new Error('La deuda tiene pagos')
      err.code = 'debt/has-payments'
      throw err
    }
    const ref = doc(col, id)
    await deleteDoc(ref)
  }

  return { subscribeDebts, fetchDebts, createDebt, updateDebt, deleteDebt }
}
