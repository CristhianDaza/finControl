import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, orderBy as fbOrderBy, query, serverTimestamp, where, runTransaction } from 'firebase/firestore'

export const useTransactions = () => {
  const getUserPaths = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return {
      uid,
      txCol: collection(db, 'users', uid, 'transactions'),
      accColPath: ['users', uid, 'accounts'],
    }
  }

  const buildQuery = (opts = {}) => {
    const { txCol } = getUserPaths()
    const clauses = []
    if (opts.type) clauses.push(where('type', '==', opts.type))
    if (opts.accountId) clauses.push(where('accountId', '==', opts.accountId))
    if (opts.categoryId) clauses.push(where('categoryId', '==', opts.categoryId))
    if (opts.from) clauses.push(where('date', '>=', opts.from))
    if (opts.to) clauses.push(where('date', '<=', opts.to))
    const orders = (opts.orderBy && Array.isArray(opts.orderBy) && opts.orderBy.length) ? opts.orderBy : [{ field: 'date', dir: 'desc' }, { field: 'createdAt', dir: 'desc' }]
    const orderOps = orders.map(o => fbOrderBy(o.field, o.dir))
    return query(txCol, ...clauses, ...orderOps)
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

  const cents = (n) => Math.round(Number(n || 0) * 100)
  const fromCents = (c) => Number(c || 0) / 100

  const createTransaction = async (payload) => {
    const { uid, txCol, accColPath } = getUserPaths()
    const txRef = doc(txCol) // id automático
    const accountId = payload.accountId || payload.account
    if (!accountId) throw new Error('Cuenta requerida')
    const type = payload.type
    const amountC = cents(payload.amount)
    if (!['income','expense'].includes(type)) throw new Error('Tipo inválido')
    if (amountC <= 0) throw new Error('Monto inválido')

    await runTransaction(db, async (trx) => {
      const accRef = doc(db, ...accColPath, accountId)
      const accSnap = await trx.get(accRef)
      if (!accSnap.exists()) throw new Error('AccountNotFound')
      const acc = accSnap.data()
      const currentBalC = cents(acc.balance)
      const delta = type === 'income' ? amountC : -amountC
      const nextBalC = currentBalC + delta
      if (nextBalC < 0) throw new Error('BalanceNegative')

      trx.update(accRef, { balance: fromCents(nextBalC), updatedAt: serverTimestamp() })
      trx.set(txRef, {
        ownerId: uid,
        type,
        amount: fromCents(amountC),
        currency: payload.currency || acc.currency || 'COP',
        categoryId: payload.categoryId || '',
        accountId,
        date: payload.date,
        note: payload.description || payload.note || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    return txRef.id
  }

  const updateTransaction = async (id, payload) => {
    const { uid, txCol, accColPath } = getUserPaths()
    const txRef = doc(txCol, id)

    await runTransaction(db, async (trx) => {
      const txSnap = await trx.get(txRef)
      if (!txSnap.exists()) throw new Error('TxNotFound')
      const prev = txSnap.data()
      if (prev.ownerId && prev.ownerId !== uid) throw new Error('Unauthorized')

      const newType = payload.type || prev.type
      const newAccountId = payload.accountId || payload.account || prev.accountId
      const newAmountC = payload.amount != null ? cents(payload.amount) : cents(prev.amount)
      if (!['income','expense'].includes(newType)) throw new Error('Tipo inválido')
      if (newAmountC <= 0) throw new Error('Monto inválido')

      // revertir efecto anterior
      const prevAccRef = doc(db, ...accColPath, prev.accountId)
      const prevAccSnap = await trx.get(prevAccRef)
      if (!prevAccSnap.exists()) throw new Error('AccountNotFound')
      const prevAcc = prevAccSnap.data()
      const prevBalC = cents(prevAcc.balance)
      const prevDelta = prev.type === 'income' ? -cents(prev.amount) : cents(prev.amount)
      const prevNextBalC = prevBalC + prevDelta
      if (prevNextBalC < 0) throw new Error('BalanceNegative')
      trx.update(prevAccRef, { balance: fromCents(prevNextBalC), updatedAt: serverTimestamp() })

      // aplicar nuevo efecto
      const nextAccRef = doc(db, ...accColPath, newAccountId)
      const nextAccSnap = prev.accountId === newAccountId ? prevAccSnap : await trx.get(nextAccRef)
      if (!nextAccSnap.exists()) throw new Error('AccountNotFound')
      const nextAcc = nextAccSnap.data()
      const nextBalC = cents(nextAcc.balance)
      const nextDelta = newType === 'income' ? newAmountC : -newAmountC
      const appliedBalC = nextBalC + nextDelta
      if (appliedBalC < 0) throw new Error('BalanceNegative')
      trx.update(nextAccRef, { balance: fromCents(appliedBalC), updatedAt: serverTimestamp() })

      const patch = { ...payload }
      if (patch.amount != null) patch.amount = fromCents(newAmountC)
      if (patch.account) { patch.accountId = patch.account; delete patch.account }
      if (patch.description) { patch.note = patch.description; delete patch.description }
      patch.ownerId = prev.ownerId || uid // no permitir cambio de ownerId
      patch.updatedAt = serverTimestamp()
      trx.update(txRef, patch)
    })
  }

  const deleteTransaction = async (id) => {
    const { uid, txCol, accColPath } = getUserPaths()
    const txRef = doc(txCol, id)

    await runTransaction(db, async (trx) => {
      const txSnap = await trx.get(txRef)
      if (!txSnap.exists()) return
      const data = txSnap.data()
      if (data.ownerId && data.ownerId !== uid) throw new Error('Unauthorized')

      const accRef = doc(db, ...accColPath, data.accountId)
      const accSnap = await trx.get(accRef)
      if (!accSnap.exists()) throw new Error('AccountNotFound')
      const acc = accSnap.data()
      const balC = cents(acc.balance)
      const delta = data.type === 'income' ? -cents(data.amount) : cents(data.amount)
      const nextBalC = balC + delta
      if (nextBalC < 0) throw new Error('BalanceNegative')

      trx.update(accRef, { balance: fromCents(nextBalC), updatedAt: serverTimestamp() })
      trx.delete(txRef)
    })
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
