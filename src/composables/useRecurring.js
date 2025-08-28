import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, orderBy as fbOrderBy, query, where, serverTimestamp, runTransaction, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useTransactions } from '@/composables/useTransactions.js'
import { validateTransactionPayload } from '@/utils/validateTransactionPayload.js'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

const pad2 = (n) => String(n).padStart(2, '0')
const toISO = (d) => {
  if (typeof d === 'string') return d
  const dd = d instanceof Date ? d : new Date(d)
  const y = dd.getFullYear()
  const m = pad2(dd.getMonth() + 1)
  const day = pad2(dd.getDate())
  return `${y}-${m}-${day}`
}
const addDays = (iso, days) => {
  const [y,m,d] = iso.split('-').map(n=>parseInt(n,10))
  const dt = new Date(y, m-1, d)
  dt.setDate(dt.getDate() + days)
  return toISO(dt)
}
const addMonths = (iso, months) => {
  const [y,m,d] = iso.split('-').map(n=>parseInt(n,10))
  const dt = new Date(y, m-1, d)
  dt.setMonth(dt.getMonth() + months)
  const ny = dt.getFullYear(), nm = dt.getMonth() + 1
  const lastDay = new Date(ny, nm, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${ny}-${pad2(nm)}-${pad2(day)}`
}
const addYears = (iso, years) => {
  const [y,m,d] = iso.split('-').map(n=>parseInt(n,10))
  const ny = y + years
  const lastDay = new Date(ny, m, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${ny}-${pad2(m)}-${pad2(day)}`
}

const nextFrom = (frequency, currentIso) => {
  switch (frequency) {
    case 'weekly': return addDays(currentIso, 7)
    case 'biweekly': return addDays(currentIso, 14)
    case 'monthly': return addMonths(currentIso, 1)
    case 'yearly': return addYears(currentIso, 1)
    default: return addMonths(currentIso, 1)
  }
}

const normalizeIsoDate = (val) => {
  try {
    if (!val) return toISO(new Date())
    if (typeof val === 'string') {
      const m = val.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) return m[1]
      const dt = new Date(val)
      if (!isNaN(dt.getTime())) return toISO(dt)
      return toISO(new Date())
    }
    if (val instanceof Date) return toISO(val)
    return toISO(new Date(val))
  } catch { return toISO(new Date()) }
}

export const useRecurring = () => {
  const gate = () => {
    const a = useAuthStore()
    if (!a.canWrite) {
      useNotify().info(t('access.readOnly'))
      return true
    }
    return false
  }

  const getUserPaths = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    return {
      uid,
      tplCol: collection(db, 'users', uid, 'recurringTemplates'),
      runsColPath: ['users', uid, 'recurringRuns']
    }
  }

  const subscribeTemplates = (cb, opts = {}) => {
    const { tplCol } = getUserPaths()
    const clauses = []
    if (opts.paused != null) clauses.push(where('paused', '==', !!opts.paused))
    const q = query(tplCol, ...clauses, fbOrderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d => {
        const raw = { id: d.id, ...d.data() }
        const categoryId = raw.categoryId || raw.category || ''
        return { ...raw, categoryId, category: categoryId }
      })
      cb(items)
    })
  }

  const fetchDueTemplates = async () => {
    const { tplCol } = getUserPaths()
    const today = toISO(new Date())
    const q = query(tplCol, where('paused', '==', false), where('nextRunAt', '<=', today), fbOrderBy('nextRunAt', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const createTemplate = async (payload) => {
    if (gate()) return
    const { uid, tplCol } = getUserPaths()
    const ref = doc(tplCol)
    const firstRunRaw = payload.firstRunAt || payload.nextRunAt || new Date()
    const firstRun = normalizeIsoDate(firstRunRaw)
    const data = {
      ownerId: uid,
      name: payload.name || '',
      type: payload.type || 'expense',
      amount: Number(payload.amount || 0),
      accountId: payload.accountId || payload.account || '',
      debtId: payload.debtId || payload.debt || null,
      categoryId: payload.categoryId || payload.category || '',
      note: payload.note || '',
      frequency: payload.frequency || 'monthly',
      nextRunAt: firstRun,
      paused: !!payload.paused,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    await setDoc(ref, data)
    return ref.id
  }

  const updateTemplate = async (id, patch) => {
    if (gate()) return
    const { tplCol } = getUserPaths()
    const ref = doc(tplCol, id)
    const data = { ...patch, updatedAt: serverTimestamp() }
    if (data.debt && !data.debtId) { data.debtId = data.debt; delete data.debt }
    if (data.category && !data.categoryId) { data.categoryId = data.category; delete data.category }
    if (data.firstRunAt && !data.nextRunAt) { data.nextRunAt = normalizeIsoDate(data.firstRunAt); delete data.firstRunAt }
    if (data.nextRunAt) data.nextRunAt = normalizeIsoDate(data.nextRunAt)
    if (data.type && data.type !== 'debtPayment') data.debtId = null
    if ('debtId' in data && (data.debtId === '' || data.debtId === undefined)) data.debtId = null
    Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k] })
    try { await updateDoc(ref, data) } catch (e) { console.error('[recurring] updateTemplate error', id, data, e); throw e }
  }

  const deleteTemplate = async (id) => {
    if (gate()) return
    const { tplCol } = getUserPaths()
    await deleteDoc(doc(tplCol, id))
  }

  const maxCatchUpMap = { weekly:104, biweekly:78, monthly:36, yearly:5 }

  const processDueOnce = async () => {
    if (gate()) return { processed:0 }
    const { uid, runsColPath, tplCol } = getUserPaths()
    const due = await fetchDueTemplates()
    if (!due.length) return { processed: 0 }
    const { createTransaction } = useTransactions()
    let processed = 0
    const today = toISO(new Date())
    const { info } = useNotify()

    for (const tplOrig of due) {
      try {
        const tpl = { ...tplOrig }
        if (!tpl.accountId) continue
        if (!(Number(tpl.amount) > 0)) continue
        if (tpl.type === 'debtPayment' && !tpl.debtId) continue
        const maxCatch = maxCatchUpMap[tpl.frequency] || 36
        let count = 0
        let partial = false
        while (tpl.nextRunAt <= today && count < maxCatch) {
          const validation = validateTransactionPayload({ type: tpl.type, amount: tpl.amount, accountId: tpl.accountId, date: tpl.nextRunAt })
            if (!validation.valid) break
          const periodKey = String(tpl.nextRunAt)
          const lockId = `${tpl.id}__${periodKey}`
          const lockRef = doc(db, ...runsColPath, lockId)
          const nowIso = new Date().toISOString()
          const locked = await runTransaction(db, async (trx) => {
            const snap = await trx.get(lockRef)
            if (snap.exists()) return false
            trx.set(lockRef, { ownerId: uid, templateId: tpl.id, periodKey, status: 'pending', clientTime: nowIso, createdAt: serverTimestamp(), retries: 0 })
            return true
          })
          if (locked) {
            let txId = null
            try {
              txId = await createTransaction({ type: tpl.type || 'expense', amount: tpl.amount, accountId: tpl.accountId, categoryId: tpl.categoryId || tpl.category || '', debtId: tpl.debtId || undefined, date: periodKey, note: tpl.note || tpl.name || '', meta: { isRecurring: true, recurringTemplateId: tpl.id, periodKey } })
              await runTransaction(db, async (trx) => { trx.update(lockRef, { status: 'done', txId, updatedAt: serverTimestamp() }) })
              processed += 1
            } catch (e) {
              try { await runTransaction(db, async (trx) => { trx.update(lockRef, { status: 'error', errorMessage: String(e?.message||e), updatedAt: serverTimestamp() }) }) } catch {}
            }
          }
          const next = nextFrom(tpl.frequency, tpl.nextRunAt)
          try { await runTransaction(db, async (trx) => { trx.update(doc(tplCol, tpl.id), { lastRunAt: tpl.nextRunAt, nextRunAt: next, updatedAt: serverTimestamp() }) }) } catch {}
          tpl.nextRunAt = next
          count += 1
        }
        if (count >= maxCatch && tpl.nextRunAt <= today) {
          partial = true
          try { await runTransaction(db, async (trx) => { trx.update(doc(tplCol, tpl.id), { partialCatchUp: true, updatedAt: serverTimestamp() }) }) } catch {}
          try { info(t('recurring.notifications.partialCatchUp', { name: tpl.name||'' })) } catch {}
        } else if (partial && tpl.nextRunAt > today) {
          try { await runTransaction(db, async (trx) => { trx.update(doc(tplCol, tpl.id), { partialCatchUp: false, updatedAt: serverTimestamp() }) }) } catch {}
        }
      } catch (outer) { console.error('[recurring] Error inesperado procesando plantilla', tplOrig?.id, outer) }
    }
    return { processed }
  }

  return { subscribeTemplates, fetchDueTemplates, createTemplate, updateTemplate, deleteTemplate, processDueOnce }
}
