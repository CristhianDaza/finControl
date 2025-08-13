import { auth, db } from '@/services/firebase.js'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy as fbOrderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'

export const useTransactions = () => {
  const getUserCol = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return collection(db, 'users', uid, 'transactions')
  }

  const buildQuery = (opts = {}) => {
    const col = getUserCol()
    const clauses = []
    if (opts.type) clauses.push(where('type', '==', opts.type))
    if (opts.accountId) clauses.push(where('accountId', '==', opts.accountId))
    if (opts.categoryId) clauses.push(where('categoryId', '==', opts.categoryId))
    if (opts.from) clauses.push(where('date', '>=', opts.from))
    if (opts.to) clauses.push(where('date', '<=', opts.to))
    const orders = (opts.orderBy && Array.isArray(opts.orderBy) && opts.orderBy.length) ? opts.orderBy : [{ field: 'date', dir: 'desc' }, { field: 'createdAt', dir: 'desc' }]
    const orderOps = orders.map(o => fbOrderBy(o.field, o.dir))
    return query(col, ...clauses, ...orderOps)
  }

  const fetchTransactions = async (opts = {}) => {
    return new Promise((resolve, reject) => {
      try {
        const q = buildQuery(opts)
        const unsub = onSnapshot(q, snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          unsub()
          resolve(items)
        }, reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  const createTransaction = async (payload) => {
    const col = getUserCol()
    const data = {
      type: payload.type,
      amount: Number(payload.amount || 0),
      currency: payload.currency || 'USD',
      categoryId: payload.categoryId || '',
      accountId: payload.accountId || payload.account || '',
      date: payload.date,
      note: payload.description || payload.note || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(col, data)
    return ref.id
  }

  const updateTransaction = async (id, payload) => {
    const ref = doc(getUserCol(), id)
    const data = { ...payload, updatedAt: serverTimestamp() }
    if (data.amount != null) data.amount = Number(data.amount)
    if (data.account) { data.accountId = data.account; delete data.account }
    if (data.description) { data.note = data.description; delete data.description }
    await updateDoc(ref, data)
  }

  const deleteTransaction = async (id) => {
    const ref = doc(getUserCol(), id)
    await deleteDoc(ref)
  }

  const subscribeTransactions = (cb, opts = {}) => {
    const q = buildQuery(opts)
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      cb(items)
    })
  }

  return { fetchTransactions, createTransaction, updateTransaction, deleteTransaction, subscribeTransactions }
}

