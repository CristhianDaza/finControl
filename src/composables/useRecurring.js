import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, orderBy as fbOrderBy, query, where, serverTimestamp, runTransaction, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useTransactions } from '@/composables/useTransactions.js'
import { validateTransactionPayload } from '@/utils/validateTransactionPayload.js'

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
    const { tplCol } = getUserPaths()
    const ref = doc(tplCol, id)
    const data = { ...patch, updatedAt: serverTimestamp() }
    if (data.category && !data.categoryId) { data.categoryId = data.category; delete data.category }
    if (data.firstRunAt && !data.nextRunAt) { data.nextRunAt = normalizeIsoDate(data.firstRunAt); delete data.firstRunAt }
    if (data.nextRunAt) data.nextRunAt = normalizeIsoDate(data.nextRunAt)
    await updateDoc(ref, data)
  }

  const deleteTemplate = async (id) => {
    const { tplCol } = getUserPaths()
    await deleteDoc(doc(tplCol, id))
  }

  const processDueOnce = async () => {
    const { uid, runsColPath, tplCol } = getUserPaths()
    const due = await fetchDueTemplates()
    if (!due.length) return { processed: 0 }
    const { createTransaction } = useTransactions()
    let processed = 0
    const LOCK_TTL_MS = 10 * 60 * 1000

    for (const t of due) {
      try {
        if (!t.accountId) { console.warn('[recurring] Plantilla sin accountId, skip', t.id); continue }
        if (!(Number(t.amount) > 0)) { console.warn('[recurring] Monto inválido, skip', t.id); continue }
        if (t.type === 'debtPayment' && !t.debtId) { console.warn('[recurring] debtPayment sin debtId, skip', t.id); continue }
        const validation = validateTransactionPayload({
          type: t.type,
          amount: t.amount,
          accountId: t.accountId,
          date: t.nextRunAt
        })
        if (!validation.valid) {
          console.warn('[recurring] Validación falló', t.id, validation.errors)
          continue
        }

        const periodKey = String(t.nextRunAt)
        const lockId = `${t.id}__${periodKey}`
        const lockRef = doc(db, ...runsColPath, lockId)
        const nowIso = new Date().toISOString()

        const locked = await runTransaction(db, async (trx) => {
          const snap = await trx.get(lockRef)
          if (snap.exists()) {
            const data = snap.data() || {}
            if (['pending','recovering','error'].includes(data.status)) {
              let stale = false
              try {
                if (data.clientTime) {
                  const age = Date.now() - Date.parse(data.clientTime)
                  stale = age > LOCK_TTL_MS
                } else {
                  stale = true
                }
              } catch { stale = true }
              if (data.status === 'error' && !stale) {
                try {
                  if (data.updatedAt?.toDate) {
                    const age2 = Date.now() - data.updatedAt.toDate().getTime()
                    if (age2 > 60 * 1000) stale = true
                  }
                } catch {}
              }
              if (stale) {
                trx.set(lockRef, { ownerId: uid, templateId: t.id, periodKey, status: 'recovering', clientTime: nowIso, updatedAt: serverTimestamp(), createdAt: data.createdAt || serverTimestamp(), retries: (data.retries||0)+1 })
                return true
              }
            }
            return false
          }
          trx.set(lockRef, { ownerId: uid, templateId: t.id, periodKey, status: 'pending', clientTime: nowIso, createdAt: serverTimestamp(), retries: 0 })
          return true
        })
        if (!locked) continue

        let txId = null
        try {
          txId = await createTransaction({
            type: t.type || 'expense',
            amount: t.amount,
            accountId: t.accountId,
            categoryId: t.categoryId || t.category || '',
            debtId: t.debtId || undefined,
            date: t.nextRunAt,
            note: t.note || t.name || '',
            meta: { isRecurring: true, recurringTemplateId: t.id, periodKey }
          })
        } catch (e) {
          console.error('[recurring] Error creando transacción', t.id, e)
          try { await updateDoc(lockRef, { status: 'error', errorMessage: String(e?.message||e), updatedAt: serverTimestamp() }) } catch {}
          continue
        }

        const tplRef = doc(tplCol, t.id)
        try {
          await runTransaction(db, async (trx) => {
            const next = nextFrom(t.frequency, t.nextRunAt)
            trx.update(tplRef, { lastRunAt: t.nextRunAt, nextRunAt: next, updatedAt: serverTimestamp() })
            trx.update(lockRef, { status: 'done', txId, updatedAt: serverTimestamp() })
          })
          processed += 1
        } catch (e) {
          console.error('[recurring] Error actualizando template/lock', t.id, e)
          try { await updateDoc(lockRef, { status: 'error', errorMessage: String(e?.message||e), updatedAt: serverTimestamp() }) } catch {}
        }
      } catch (outer) {
        console.error('[recurring] Error inesperado procesando plantilla', t?.id, outer)
      }
    }
    return { processed }
  }

  return { subscribeTemplates, fetchDueTemplates, createTemplate, updateTemplate, deleteTemplate, processDueOnce }
}
