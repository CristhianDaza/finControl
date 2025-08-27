import { defineStore } from 'pinia'
import { useAdmin } from '@/composables/useAdmin.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'
import { useAuthStore } from '@/stores/auth.js'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    kpis: { total: 0, active: 0, inactive: 0 },
    users: [],
    invites: [],
    loadingKpis: false,
    loadingUsers: false,
    loadingInvites: false,
    migrating: false,
    filters: { user: { from: null, to: null, role: '', rangeType: 'createdAt' }, invites: { status: '', plan: '', from: null, to: null } },
    plan: 'monthly',
  }),
  actions: {
    async refreshKpis() { const api = useAdmin(); this.loadingKpis = true; try { this.kpis = await api.countUsers() } finally { this.loadingKpis = false } },
    async refreshUsers() { const api = useAdmin(); this.loadingUsers = true; try { this.users = await api.listUsers({ ...this.filters.user }) } finally { this.loadingUsers = false } },
    async refreshInvites() { const api = useAdmin(); this.loadingInvites = true; try { this.invites = await api.listInviteCodes({ ...this.filters.invites }) } finally { this.loadingInvites = false } },
    async generateCode() { const api = useAdmin(); const notify = useNotify(); const auth = useAuthStore(); const res = await api.createInviteCode({ plan: this.plan, createdBy: auth.user?.uid || 'client' }); notify.success(t('admin.invites.generated')); await this.refreshInvites(); return res },
    async invalidate(id) { const api = useAdmin(); const notify = useNotify(); await api.invalidateInviteCode(id); notify.info(t('admin.invites.invalidated')); await this.refreshInvites() },
    async migrateCodes() { const api = useAdmin(); const notify = useNotify(); this.migrating = true; try { const r = await api.migrateInviteCodes(); notify.success(t('admin.invites.migrated', { created: r.created, skipped: r.skipped })) } finally { this.migrating = false; await this.refreshInvites() } },
  },
})
