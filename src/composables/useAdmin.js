import { db } from '@/services/firebase.js'
import { collection, serverTimestamp, query, where, getDocs, getCountFromServer, orderBy, limit, updateDoc, doc, Timestamp, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { t } from '@/i18n/index.js'

export const useAdmin = () => {
  const usersCol = collection(db, 'users')
  const invitesCol = collection(db, 'inviteCodes')
  const activeThresholdMs = 30 * 24 * 60 * 60 * 1000
  const genCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36]).join('')

  const countUsers = async () => {
    const now = Date.now()
    const activeLimit = Timestamp.fromMillis(now - activeThresholdMs)
    const totalSnap = await getCountFromServer(usersCol)
    const activeQ = query(usersCol, where('lastActiveAt', '>=', activeLimit))
    const activeSnap = await getCountFromServer(activeQ)
    return { total: totalSnap.data().count, active: activeSnap.data().count, inactive: totalSnap.data().count - activeSnap.data().count }
  }

  const listUsers = async ({ from, to, role, rangeType='createdAt', limitSize=100 }={}) => {
    const clauses = []
    if (role) clauses.push(where('role','==', role))
    const field = rangeType === 'lastActiveAt' ? 'lastActiveAt' : 'createdAt'
    if (from) clauses.push(where(field, '>=', Timestamp.fromMillis(from)))
    if (to) clauses.push(where(field, '<=', Timestamp.fromMillis(to)))
    const qBuild = query(usersCol, ...clauses, orderBy(field,'desc'), limit(limitSize))
    const snap = await getDocs(qBuild)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const createInviteCode = async ({ plan, createdBy }) => {
    let code
    for (let i=0;i<5;i++) { code = genCode(); const chk = await getDoc(doc(db,'inviteCodes', code)); if (!chk.exists()) break }
    const now = Date.now()
    const days = plan === 'annual' ? 365 : plan === 'semiannual' ? 182 : 30
    const expiresAt = Timestamp.fromMillis(now + days*24*60*60*1000)
    const graceExpiresAt = Timestamp.fromMillis(now + 7*24*60*60*1000)
    await setDoc(doc(db,'inviteCodes', code), { code, createdAt: serverTimestamp(), createdBy: createdBy || 'client', status: 'unused', plan, expiresAt, graceExpiresAt })
    return { id: code, code, plan }
  }

  const invalidateInviteCode = async (id) => { await updateDoc(doc(db,'inviteCodes', id), { status: 'expired' }) }

  const listInviteCodes = async ({ status, plan, from, to, limitSize=100 }={}) => {
    const clauses = []
    if (status) clauses.push(where('status','==', status))
    if (plan) clauses.push(where('plan','==', plan))
    if (from) clauses.push(where('createdAt','>=', Timestamp.fromMillis(from)))
    if (to) clauses.push(where('createdAt','<=', Timestamp.fromMillis(to)))
    const qBuild = query(invitesCol, ...clauses, orderBy('createdAt','desc'), limit(limitSize))
    const snap = await getDocs(qBuild)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const validateInviteCode = async (code) => {
    const snap = await getDoc(doc(db,'inviteCodes', code.toUpperCase()))
    if (!snap.exists()) return { ok:false, error: t('errors.invite.not_found') }
    const data = snap.data()
    if (data.status !== 'unused') return { ok:false, error: t('errors.invite.used') }
    const now = Date.now()
    const exp1 = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : data.expiresAt
    const exp2 = data.graceExpiresAt?.toMillis ? data.graceExpiresAt.toMillis() : data.graceExpiresAt
    if (now >= Math.min(exp1 || 0, exp2 || 0)) return { ok:false, error: t('errors.invite.expired') }
    return { ok:true, doc: { id: snap.id, ...data } }
  }

  const migrateInviteCodes = async () => {
    const snap = await getDocs(invitesCol)
    let created = 0, skipped = 0
    for (const d of snap.docs) {
      const data = d.data()
      if (!data.code) { skipped++; continue }
      const targetId = data.code
      if (d.id === targetId) { skipped++; continue }
      const targetRef = doc(db,'inviteCodes', targetId)
      const targetSnap = await getDoc(targetRef)
      if (!targetSnap.exists()) {
        await setDoc(targetRef, { ...data })
        await deleteDoc(d.ref)
        created++
      } else skipped++
    }
    return { created, skipped }
  }

  return { countUsers, listUsers, createInviteCode, invalidateInviteCode, listInviteCodes, validateInviteCode, migrateInviteCodes }
}
