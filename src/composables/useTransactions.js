import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, orderBy as fbOrderBy, query, serverTimestamp, where, runTransaction } from 'firebase/firestore'

export const useTransactions = () => {
  const getUserPaths = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return { uid, txCol: collection(db, 'users', uid, 'transactions'), accColPath: ['users', uid, 'accounts'], debtColPath: ['users', uid, 'debts'] }
  }

  const buildQuery = (opts = {}) => {
    const { txCol } = getUserPaths()
    const clauses = []
    if (opts.type) clauses.push(where('type', '==', opts.type))
    if (opts.accountId) clauses.push(where('accountId', '==', opts.accountId))
    if (opts.categoryId) clauses.push(where('categoryId', '==', opts.categoryId))
    if (opts.debtId) clauses.push(where('debtId', '==', opts.debtId))
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
  const normalizeType = (type) => {
    const key = String(type || '').replace(/\s+/g, '').toLowerCase()
    if (key === 'income' || key === 'ingreso') return 'income'
    if (key === 'expense' || key === 'gasto') return 'expense'
    if (key === 'debtpayment') return 'debtPayment'
    return type
  }

  const createTransaction = async (payload) => {
    const { uid, txCol, accColPath, debtColPath } = getUserPaths()
    const txRef = doc(txCol)
    const accountId = payload.accountId || payload.account
    if (!accountId) throw new Error('Cuenta requerida')
    const type = normalizeType(payload.type)
    const amountC = cents(payload.amount)
    if (!['income','expense','debtPayment'].includes(type)) throw new Error('Tipo inválido')
    if (amountC <= 0) throw new Error('Monto inválido')

    await runTransaction(db, async (trx) => {
      const accRef = doc(db, ...accColPath, accountId)
      const accSnap = await trx.get(accRef)
      if (!accSnap.exists()) throw new Error('AccountNotFound')
      const acc = accSnap.data()
      const currentBalC = cents(acc.balance)
      let deltaAccC = 0
      let extra = {}
      if (type === 'income') {
        deltaAccC = amountC
      } else if (type === 'expense') {
        deltaAccC = -amountC
      } else if (type === 'debtPayment') {
        const debtId = payload.debtId || payload.debt
        if (!debtId) throw new Error('DebtRequired')
        const debtRef = doc(db, ...debtColPath, debtId)
        const debtSnap = await trx.get(debtRef)
        if (!debtSnap.exists()) throw new Error('DebtNotFound')
        const debt = debtSnap.data()
        const remC = cents(debt.remainingAmount)
        const nextRemC = remC - amountC
        if (nextRemC < 0) throw new Error('DebtRemainingNegative')
        trx.update(debtRef, { remainingAmount: fromCents(nextRemC), status: nextRemC === 0 ? 'paid' : 'active', updatedAt: serverTimestamp() })
        deltaAccC = -amountC
        extra.debtId = debtId
      }
      const nextBalC = currentBalC + deltaAccC
      if (nextBalC < 0) throw new Error('BalanceNegative')
      trx.update(accRef, { balance: fromCents(nextBalC), updatedAt: serverTimestamp() })
      trx.set(txRef, { ownerId: uid, type, amount: fromCents(amountC), currency: payload.currency || acc.currency || 'COP', categoryId: payload.categoryId || '', accountId, debtId: extra.debtId || null, date: payload.date, note: payload.description || payload.note || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    })

    return txRef.id
  }

  const updateTransaction = async (id, payload) => {
    const { uid, txCol, accColPath, debtColPath } = getUserPaths()
    const txRef = doc(txCol, id)

    await runTransaction(db, async (trx) => {
      const txSnap = await trx.get(txRef)
      if (!txSnap.exists()) throw new Error('TxNotFound')
      const prev = txSnap.data()
      if (prev.ownerId && prev.ownerId !== uid) throw new Error('Unauthorized')
      const newType = normalizeType(payload.type || prev.type)
      const newAccountId = payload.accountId || payload.account || prev.accountId
      const newDebtId = payload.debtId || payload.debt || prev.debtId || null
      const newAmountC = payload.amount != null ? cents(payload.amount) : cents(prev.amount)
      if (!['income','expense','debtPayment'].includes(newType)) throw new Error('Tipo inválido')
      if (newAmountC <= 0) throw new Error('Monto inválido')
      const prevAccRef = doc(db, ...accColPath, prev.accountId)
      const prevAccSnap = await trx.get(prevAccRef)
      if (!prevAccSnap.exists()) throw new Error('AccountNotFound')
      const prevAcc = prevAccSnap.data()
      const prevBalC = cents(prevAcc.balance)
      let prevDeltaAccC = 0
      if (prev.type === 'income') prevDeltaAccC = -cents(prev.amount)
      else if (prev.type === 'expense') prevDeltaAccC = cents(prev.amount)
      else if (prev.type === 'debtPayment') prevDeltaAccC = cents(prev.amount)
      const prevNextBalC = prevBalC + prevDeltaAccC
      if (prevNextBalC < 0) throw new Error('BalanceNegative')
      trx.update(prevAccRef, { balance: fromCents(prevNextBalC), updatedAt: serverTimestamp() })
      if (prev.type === 'debtPayment' && prev.debtId) {
        const prevDebtRef = doc(db, ...debtColPath, prev.debtId)
        const prevDebtSnap = await trx.get(prevDebtRef)
        if (!prevDebtSnap.exists()) throw new Error('DebtNotFound')
        const prevDebt = prevDebtSnap.data()
        const remC = cents(prevDebt.remainingAmount)
        const nextRemC = remC + cents(prev.amount)
        trx.update(prevDebtRef, { remainingAmount: fromCents(nextRemC), status: nextRemC === 0 ? 'paid' : 'active', updatedAt: serverTimestamp() })
      }
      const nextAccRef = doc(db, ...accColPath, newAccountId)
      const nextAccSnap = prev.accountId === newAccountId ? prevAccSnap : await trx.get(nextAccRef)
      if (!nextAccSnap.exists()) throw new Error('AccountNotFound')
      const nextAcc = nextAccSnap.data()
      const nextBalC = cents(nextAcc.balance)
      let nextDeltaAccC = 0
      if (newType === 'income') nextDeltaAccC = newAmountC
      else if (newType === 'expense') nextDeltaAccC = -newAmountC
      else if (newType === 'debtPayment') nextDeltaAccC = -newAmountC
      const appliedBalC = nextBalC + nextDeltaAccC
      if (appliedBalC < 0) throw new Error('BalanceNegative')
      trx.update(nextAccRef, { balance: fromCents(appliedBalC), updatedAt: serverTimestamp() })
      if (newType === 'debtPayment') {
        if (!newDebtId) throw new Error('DebtRequired')
        const debtRef = doc(db, ...debtColPath, newDebtId)
        const debtSnap = await trx.get(debtRef)
        if (!debtSnap.exists()) throw new Error('DebtNotFound')
        const debt = debtSnap.data()
        const remC = cents(debt.remainingAmount)
        const nextRemC = remC - newAmountC
        if (nextRemC < 0) throw new Error('DebtRemainingNegative')
        trx.update(debtRef, { remainingAmount: fromCents(nextRemC), status: nextRemC === 0 ? 'paid' : 'active', updatedAt: serverTimestamp() })
      }
      const patch = { ...payload }
      if (patch.amount != null) patch.amount = fromCents(newAmountC)
      if (patch.account) { patch.accountId = patch.account; delete patch.account }
      if (patch.debt) { patch.debtId = patch.debt; delete patch.debt }
      if (patch.description) { patch.note = patch.description; delete patch.description }
      patch.ownerId = prev.ownerId || uid
      patch.updatedAt = serverTimestamp()
      trx.update(txRef, patch)
    })
  }

  const deleteTransaction = async (id) => {
    const { uid, txCol, accColPath, debtColPath } = getUserPaths()
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
      let deltaAccC = 0
      if (data.type === 'income') deltaAccC = -cents(data.amount)
      else if (data.type === 'expense') deltaAccC = cents(data.amount)
      else if (data.type === 'debtPayment') deltaAccC = cents(data.amount)
      const nextBalC = balC + deltaAccC
      if (nextBalC < 0) throw new Error('BalanceNegative')
      trx.update(accRef, { balance: fromCents(nextBalC), updatedAt: serverTimestamp() })
      if (data.type === 'debtPayment' && data.debtId) {
        const debtRef = doc(db, ...debtColPath, data.debtId)
        const debtSnap = await trx.get(debtRef)
        if (!debtSnap.exists()) throw new Error('DebtNotFound')
        const debt = debtSnap.data()
        const remC = cents(debt.remainingAmount)
        const nextRemC = remC + cents(data.amount)
        trx.update(debtRef, { remainingAmount: fromCents(nextRemC), status: nextRemC === 0 ? 'paid' : 'active', updatedAt: serverTimestamp() })
      }
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
