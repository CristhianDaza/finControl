import { db } from '@/services/firebase.js'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'

export const migrateCurrencies = async (uid) => {
  if (!uid) return
  try {
    const curSnap = await getDocs(collection(db, 'users', uid, 'currencies'))
    let defaultCode = 'COP'
    if (!curSnap.empty) {
      const list = curSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const def = list.find(c => c.isDefault)
      if (def) defaultCode = def.code
      else if (list.length === 1) defaultCode = list[0].code
    }
    const accSnap = await getDocs(collection(db, 'users', uid, 'accounts'))
    const accountMap = {}
    for (const d of accSnap.docs) {
      const data = d.data()
      accountMap[d.id] = data.currency || defaultCode
      if (!data.currency) await updateDoc(doc(db, 'users', uid, 'accounts', d.id), { currency: defaultCode })
    }
    const collections = ['transactions','debts','goals','budgets']
    for (const colName of collections) {
      const snap = await getDocs(collection(db, 'users', uid, colName))
      for (const d of snap.docs) {
        const data = d.data()
        if (colName === 'transactions') {
            if (data.isTransfer) {
              let patch = {}
              if (data.type === 'transfer-out' || data.type === 'transfer-in') {
                if (!data.currencyFrom && data.fromAccountId) patch.currencyFrom = accountMap[data.fromAccountId] || defaultCode
                if (!data.currencyTo && data.toAccountId) patch.currencyTo = accountMap[data.toAccountId] || patch.currencyFrom || defaultCode
              }
              if (Object.keys(patch).length) await updateDoc(doc(db, 'users', uid, colName, d.id), patch)
            } else if (!data.currency) {
              const acctCur = accountMap[data.accountId] || defaultCode
              await updateDoc(doc(db, 'users', uid, colName, d.id), { currency: acctCur })
            }
        } else {
          if (!data.currency) await updateDoc(doc(db, 'users', uid, colName, d.id), { currency: defaultCode })
        }
      }
    }
  } catch (e) {
    console.warn('[migrateCurrencies] fallo', e)
  }
}
