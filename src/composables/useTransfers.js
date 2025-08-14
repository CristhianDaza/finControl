import { auth, db } from '@/services/firebase.js'
import { collection, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'

export const useTransfers = () => {
  const getUserPaths = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    return { uid, txCol: collection(db, 'users', uid, 'transactions'), accColPath: ['users', uid, 'accounts'] }
  }

  const cents = n => Math.round(Number(n || 0) * 100)
  const fromCents = c => Number(c || 0) / 100
  const round2 = n => Math.round(Number(n || 0) * 100) / 100

  const createTransfer = async ({ fromAccountId, toAccountId, amountFrom, currencyFrom, amountTo, currencyTo, rate, date, note }) => {
    const { uid, txCol, accColPath } = getUserPaths()
    if (!fromAccountId || !toAccountId) throw new Error('AccountsRequired')
    if (fromAccountId === toAccountId) throw new Error('SameAccount')
    const amountFromC = cents(amountFrom)
    if (amountFromC <= 0) throw new Error('InvalidAmount')
    const transferId = doc(txCol).id
    const outRef = doc(txCol)
    const inRef = doc(txCol)

    await runTransaction(db, async trx => {
      const fromRef = doc(db, ...accColPath, fromAccountId)
      const toRef = doc(db, ...accColPath, toAccountId)
      const fromSnap = await trx.get(fromRef)
      const toSnap = await trx.get(toRef)
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error('AccountNotFound')
      const fromAcc = fromSnap.data()
      const toAcc = toSnap.data()
      const curFrom = currencyFrom || fromAcc.currency || 'COP'
      const curTo = currencyTo || toAcc.currency || curFrom
      let amtTo = amountTo != null ? Number(amountTo) : null
      let fx = rate != null ? Number(rate) : null
      if (curFrom === curTo) { amtTo = fromCents(amountFromC); fx = null }
      else {
        if (!fx || fx <= 0) throw new Error('InvalidRate')
        const calc = round2(Number(amountFrom) * fx)
        amtTo = amtTo != null && amtTo > 0 ? round2(amtTo) : calc
      }
      const amountToC = cents(amtTo)
      const fromBalC = cents(fromAcc.balance)
      const toBalC = cents(toAcc.balance)
      const nextFromBalC = fromBalC - amountFromC
      const nextToBalC = toBalC + amountToC
      if (nextFromBalC < 0) throw new Error('BalanceNegative')
      trx.update(fromRef, { balance: fromCents(nextFromBalC), updatedAt: serverTimestamp() })
      trx.update(toRef, { balance: fromCents(nextToBalC), updatedAt: serverTimestamp() })
      const base = { ownerId: uid, isTransfer: true, transferId, fromAccountId, toAccountId, amountFrom: fromCents(amountFromC), amountTo: fromCents(amountToC), currencyFrom: curFrom, currencyTo: curTo, rate: fx || null, date, note: note || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
      trx.set(outRef, { ...base, type: 'transfer-out', pairId: inRef.id })
      trx.set(inRef, { ...base, type: 'transfer-in', pairId: outRef.id })
    })

    return transferId
  }

  const updateTransfer = async (transferId, patch) => {
    const { uid, txCol, accColPath } = getUserPaths()
    const qs = await getDocs(query(txCol, where('isTransfer', '==', true), where('transferId', '==', transferId)))
    if (qs.empty) throw new Error('NotFound')
    const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
    const out = docs.find(d => d.type === 'transfer-out')
    const inn = docs.find(d => d.type === 'transfer-in')
    if (!out || !inn) throw new Error('NotFound')

    await runTransaction(db, async trx => {
      const outRef = doc(txCol, out.id)
      const inRef = doc(txCol, inn.id)
      const outSnap = await trx.get(outRef)
      const inSnap = await trx.get(inRef)
      if (!outSnap.exists() || !inSnap.exists()) throw new Error('NotFound')
      const prevOut = outSnap.data()
      const prevIn = inSnap.data()
      if ((prevOut.ownerId && prevOut.ownerId !== uid) || (prevIn.ownerId && prevIn.ownerId !== uid)) throw new Error('Unauthorized')
      const prevFromRef = doc(db, ...accColPath, prevOut.fromAccountId)
      const prevToRef = doc(db, ...accColPath, prevOut.toAccountId)
      const prevFromSnap = await trx.get(prevFromRef)
      const prevToSnap = await trx.get(prevToRef)
      if (!prevFromSnap.exists() || !prevToSnap.exists()) throw new Error('AccountNotFound')
      const prevFromBalC = cents(prevFromSnap.data().balance)
      const prevToBalC = cents(prevToSnap.data().balance)
      const revertedFromBalC = prevFromBalC + cents(prevOut.amountFrom)
      const revertedToBalC = prevToBalC - cents(prevOut.amountTo)
      if (revertedToBalC < 0) throw new Error('BalanceNegative')

      const newFromId = patch.fromAccountId || prevOut.fromAccountId
      const newToId = patch.toAccountId || prevOut.toAccountId
      if (newFromId === newToId) throw new Error('SameAccount')
      const nFromRef = doc(db, ...accColPath, newFromId)
      const nToRef = doc(db, ...accColPath, newToId)
      const nFromSnap = newFromId === prevOut.fromAccountId ? prevFromSnap : await trx.get(nFromRef)
      const nToSnap = newToId === prevOut.toAccountId ? prevToSnap : await trx.get(nToRef)
      if (!nFromSnap.exists() || !nToSnap.exists()) throw new Error('AccountNotFound')
      const nFromAcc = nFromSnap.data()
      const nToAcc = nToSnap.data()
      const curFrom = patch.currencyFrom || prevOut.currencyFrom || nFromAcc.currency || 'COP'
      const curTo = patch.currencyTo || prevOut.currencyTo || nToAcc.currency || curFrom
      const amtFromC = cents(patch.amountFrom != null ? patch.amountFrom : prevOut.amountFrom)
      if (amtFromC <= 0) throw new Error('InvalidAmount')
      let fx = patch.rate != null ? Number(patch.rate) : prevOut.rate || null
      let amtTo
      if (curFrom === curTo) { fx = null; amtTo = fromCents(amtFromC) }
      else {
        if (!fx || fx <= 0) throw new Error('InvalidRate')
        const calc = round2(fromCents(amtFromC) * fx)
        amtTo = patch.amountTo != null ? round2(patch.amountTo) : calc
      }
      const amtToC = cents(amtTo)
      const nFromBalC = cents(nFromAcc.balance)
      const nToBalC = cents(nToAcc.balance)
      const appliedFromBalC = (nFromRef.id === prevFromRef.id ? revertedFromBalC : nFromBalC) - amtFromC
      const appliedToBalC = (nToRef.id === prevToRef.id ? revertedToBalC : nToBalC) + amtToC
      if (appliedFromBalC < 0) throw new Error('BalanceNegative')
      trx.update(prevFromRef, { balance: fromCents(revertedFromBalC), updatedAt: serverTimestamp() })
      trx.update(prevToRef, { balance: fromCents(revertedToBalC), updatedAt: serverTimestamp() })
      trx.update(nFromRef, { balance: fromCents(appliedFromBalC), updatedAt: serverTimestamp() })
      trx.update(nToRef, { balance: fromCents(appliedToBalC), updatedAt: serverTimestamp() })
      const basePatch = { fromAccountId: newFromId, toAccountId: newToId, amountFrom: fromCents(amtFromC), amountTo: fromCents(amtToC), currencyFrom: curFrom, currencyTo: curTo, rate: fx || null, date: patch.date || prevOut.date, note: patch.note != null ? patch.note : prevOut.note, updatedAt: serverTimestamp() }
      trx.update(outRef, { ...basePatch, type: 'transfer-out' })
      trx.update(inRef, { ...basePatch, type: 'transfer-in' })
    })
  }

  const deleteTransfer = async transferId => {
    const { uid, txCol, accColPath } = getUserPaths()
    const qs = await getDocs(query(txCol, where('isTransfer', '==', true), where('transferId', '==', transferId)))
    if (qs.empty) return
    const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
    const out = docs.find(d => d.type === 'transfer-out')
    const inn = docs.find(d => d.type === 'transfer-in')
    if (!out || !inn) return
    await runTransaction(db, async trx => {
      const outRef = doc(txCol, out.id)
      const inRef = doc(txCol, inn.id)
      const outSnap = await trx.get(outRef)
      const inSnap = await trx.get(inRef)
      if (!outSnap.exists() || !inSnap.exists()) return
      const o = outSnap.data()
      const i = inSnap.data()
      if ((o.ownerId && o.ownerId !== uid) || (i.ownerId && i.ownerId !== uid)) throw new Error('Unauthorized')
      const fromRef = doc(db, ...accColPath, o.fromAccountId)
      const toRef = doc(db, ...accColPath, o.toAccountId)
      const fromSnap = await trx.get(fromRef)
      const toSnap = await trx.get(toRef)
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error('AccountNotFound')
      const fromBalC = cents(fromSnap.data().balance)
      const toBalC = cents(toSnap.data().balance)
      const nextFromBalC = fromBalC + cents(o.amountFrom)
      const nextToBalC = toBalC - cents(o.amountTo)
      if (nextToBalC < 0) throw new Error('BalanceNegative')
      trx.update(fromRef, { balance: fromCents(nextFromBalC), updatedAt: serverTimestamp() })
      trx.update(toRef, { balance: fromCents(nextToBalC), updatedAt: serverTimestamp() })
      trx.delete(outRef)
      trx.delete(inRef)
    })
  }

  const fetchTransferPair = async transferId => {
    const { txCol } = getUserPaths()
    const qs = await getDocs(query(txCol, where('isTransfer', '==', true), where('transferId', '==', transferId)))
    const docs = qs.docs.map(d => ({ id: d.id, ...d.data() }))
    const out = docs.find(d => d.type === 'transfer-out')
    const inn = docs.find(d => d.type === 'transfer-in')
    return { out, inn }
  }

  return { createTransfer, updateTransfer, deleteTransfer, fetchTransferPair }
}

