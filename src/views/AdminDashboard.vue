<script setup>
import { onMounted, ref, defineAsyncComponent } from 'vue'
import { useAdminStore } from '@/stores/admin.js'
import { useAuthStore } from '@/stores/auth.js'
import { t } from '@/i18n/index.js'
const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fCConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))
import { useNotify } from '@/components/global/fcNotify.js'

const admin = useAdminStore()
useAuthStore()
const showInvalidate = ref(false)
const invalidateId = ref(null)
const notify = useNotify()
const loadAll = async () => {
  await Promise.all([
    admin.refreshKpis(),
    admin.refreshUsers(),
    admin.refreshInvites()
  ])
}

const gen = async () => {
  await admin.generateCode()
}

const askInvalidate = id => {
  invalidateId.value = id
  showInvalidate.value = true
}

const doInvalidate = async () => {
  if (invalidateId.value)
    await admin.invalidate(invalidateId.value)
}

const copy = c => {
  navigator.clipboard.writeText(c.code)
    .then(() => notify.success(t('admin.invites.copied')))
}
onMounted(loadAll)
</script>

<template>
  <section class="admin-page">
    <h1>{{ t('admin.title') }}</h1>
    <div class="kpis">
      <div class="kpi" v-if="admin.kpis">
        <strong>{{ admin.kpis.total }}</strong>
        <span>{{ t('admin.kpis.total') }}</span>
      </div>
      <div class="kpi" v-if="admin.kpis">
        <strong>{{ admin.kpis.active }}</strong>
        <span>{{ t('admin.kpis.active') }}</span>
      </div>
      <div class="kpi" v-if="admin.kpis">
        <strong>{{ admin.kpis.inactive }}</strong>
        <span>{{ t('admin.kpis.inactive') }}</span>
      </div>
      <button class="button" @click="loadAll">⟳</button>
    </div>
    <div class="panel">
      <h2>{{ t('admin.users.title') }}</h2>
      <table v-if="admin.users.length" class="simple">
        <thead>
        <tr>
          <th>{{ t('admin.users.email') }}</th>
          <th>{{ t('admin.users.createdAt') }}</th>
          <th>{{ t('admin.users.lastActiveAt') }}</th>
          <th>{{ t('admin.users.planExpiresAt') }}</th>
          <th>{{ t('admin.users.isActive') }}</th>
          <th>{{ t('admin.users.role') }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="u in admin.users" :key="u.id">
          <td>{{ u.email }}</td>
          <td>{{ u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '' }}</td>
          <td>{{ u.lastActiveAt?.toDate ? u.lastActiveAt.toDate().toLocaleDateString() : '' }}</td>
          <td>{{ (u.planExpiresAt?.toDate ? u.planExpiresAt.toDate() : (u.planExpiresAt?.toMillis ? new Date(u.planExpiresAt.toMillis()) : (u.planExpiresAt ? new Date(u.planExpiresAt) : null)))?.toLocaleDateString?.() || '—' }}</td>
          <td>{{ (u.lastActiveAt?.toMillis && (Date.now()-u.lastActiveAt.toMillis()) < 30*24*60*60*1000) ? '✓' : '' }}</td>
          <td>{{ u.role }}</td>
        </tr>
        </tbody>
      </table>
      <p v-else class="empty">{{ t('admin.users.empty') }}</p>
    </div>
    <div class="panel">
      <h2>{{ t('admin.invites.title') }}</h2>
      <div class="invite-actions">
        <select v-model="admin.plan" class="input small">
          <option value="monthly">{{ t('admin.invites.plan_monthly') }}</option>
          <option value="semiannual">{{ t('admin.invites.plan_semiannual') }}</option>
          <option value="annual">{{ t('admin.invites.plan_annual') }}</option>
        </select>
        <button class="button" @click="gen">{{ t('admin.invites.create') }}</button>
        <button
          class="button button-secondary"
          :disabled="admin.migrating"
          @click="admin.migrateCodes()"
        >
          {{ admin.migrating ? t('common.loading') : t('admin.invites.migrate') }}
        </button>
      </div>
      <table v-if="admin.invites.length" class="simple">
        <thead>
        <tr>
          <th>{{ t('admin.invites.code') }}</th>
          <th>{{ t('admin.invites.plan') }}</th>
          <th>{{ t('admin.invites.status') }}</th>
          <th>{{ t('admin.invites.createdAt') }}</th>
          <th>{{ t('admin.invites.expiresAt') }}</th>
          <th>{{ t('admin.invites.usedBy') }}</th>
          <th>{{ t('admin.invites.actions') }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="c in admin.invites" :key="c.id">
          <td>{{ c.code }}</td>
          <td>{{ t('admin.invites.plan_' + c.plan) }}</td>
          <td>{{ t('admin.invites.status_' + c.status) }}</td>
          <td>{{ c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : '' }}</td>
          <td>{{ c.expiresAt?.toDate ? c.expiresAt.toDate().toLocaleDateString() : '' }}</td>
          <td>{{ c.usedByEmail || '—' }}</td>
          <td class="actions">
            <button class="button button-small" @click="copy(c)">
              {{ t('admin.invites.copy') }}
            </button>
            <button
              class="button button-delete button-small"
              v-if="c.status==='unused'"
              @click="askInvalidate(c.id)"
            >
              {{ t('admin.invites.invalidate') }}
            </button>
          </td>
        </tr>
        </tbody>
      </table>
      <p v-else class="empty">{{ t('admin.invites.empty') }}</p>
    </div>
    <FCConfirmModal
      :open="showInvalidate"
      :title="t('admin.invites.invalidate')"
      :message="t('admin.invites.confirmInvalidate')"
      @update:open="v=>showInvalidate=v"
      @confirm="doInvalidate"
    />
  </section>
</template>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem;
}
.kpis {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  flex-wrap: wrap;
}
.kpi {
  background: var(--primary-color);
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.panel {
  background: var(--primary-color);
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
}
.simple {
  width: 100%;
  border-collapse: collapse;
}
.simple th,
.simple td {
  padding: .5rem;
  border-bottom: 1px solid var(--secondary-color);
  text-align: left;
  font-size: .85rem;
}
.simple th {
  background: var(--secondary-color);
  position: sticky;
  top: 0;
}
.empty {
  opacity: .7;
}
.invite-actions {
  display: flex;
  gap: .5rem;
  margin-bottom: .75rem;
}
.input.small {
  max-width: 160px;
}
.actions {
  display: flex;
  gap: .25rem;
}
.button-small {
  padding: .25rem .5rem;
  font-size: .7rem;
}
</style>
