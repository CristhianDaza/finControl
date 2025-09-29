<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { t } from '@/i18n/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/services/firebase.js'
import { useDataCleanup } from '@/composables/useDataCleanup.js'
import { useDataExport } from '@/composables/useDataExport.js'
import { useDataImport } from '@/composables/useDataImport.js'

const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fcConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))

const store = useAuthStore()
const notify = useNotify()
const sending = ref(false)
const email = computed(() => store.user?.email || '')

const onResetPassword = async () => {
  if (!email.value || sending.value) return
  sending.value = true
  try {
    await sendPasswordResetEmail(auth, email.value)
    notify.success(t('settings.account.resetSent', { email: email.value }))
  } catch {
    notify.error(t('settings.account.resetError'))
  } finally {
    sending.value = false
  }
}

const confirmOpen = ref(false)
const deleting = ref(false)
const { deleteAllUserData } = useDataCleanup()
const canWrite = computed(() => store.canWrite)

const confirmInput = ref('')
const confirmWord = computed(() => t('settings.account.delete.confirmWord'))
const isUnlock = computed(() => confirmInput.value.trim() === String(confirmWord.value || ''))

const onRequestDelete = () => {
  if (!canWrite.value || deleting.value || !isUnlock.value) return
  confirmOpen.value = true
}

const onConfirmDelete = async () => {
  if (deleting.value) return
  deleting.value = true
  try {
    await deleteAllUserData()
    notify.success(t('settings.account.delete.success'))
    confirmInput.value = ''
  } catch {
    notify.error(t('settings.account.delete.error'))
  } finally {
    deleting.value = false
  }
}

const exporting = ref(false)
const importing = ref(false)
const importMode = ref('merge')
const importFile = ref(null)
const importData = ref(null)
const importConfirmOpen = ref(false)

const onExport = async () => {
  if (exporting.value) return
  if (!canWrite.value) {
    notify.info(t('access.readOnly'))
    return
  }
  exporting.value = true
  try {
    const { exportAll } = useDataExport()
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = URL.createObjectURL(blob)
    a.download = `fincontrol-backup-${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    notify.success(t('settings.account.io.exported'))
  } catch {
    notify.error(t('settings.account.io.exportError'))
  } finally {
    exporting.value = false
  }
}

const onPickFile = (e) => {
  const f = e.target.files && e.target.files[0]
  importFile.value = f || null
  importData.value = null
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const json = JSON.parse(String(reader.result || '{}'))
      if (!json || typeof json !== 'object' || !json.collections) throw new Error('invalid')
      importData.value = json
      notify.success(t('settings.account.io.fileReady'))
    } catch {
      importData.value = null
      notify.error(t('settings.account.io.invalidFile'))
    }
  }
  reader.onerror = () => {
    importData.value = null
    notify.error(t('settings.account.io.invalidFile'))
  }
  reader.readAsText(f)
}

const importCounts = computed(() => {
  const collections = importData.value && importData.value.collections
  if (!collections || typeof collections !== 'object') return { entries: [], total: 0 }
  const entries = Object.keys(collections).map(name => ({
    name,
    count: Array.isArray(collections[name]) ? collections[name].length : 0
  }))
  const total = entries.reduce((acc, it) => acc + (it.count || 0), 0)
  return { entries, total }
})

const requireWordForReplace = computed(() => importMode.value === 'replace')
const confirmInputImport = ref('')
const confirmWordImport = computed(() => t('settings.account.delete.confirmWord'))
const isUnlockImport = computed(() => !requireWordForReplace.value || confirmInputImport.value.trim() === String(confirmWordImport.value || ''))

const onRequestImport = () => {
  if (!canWrite.value || importing.value || !importData.value || !isUnlockImport.value) return
  importConfirmOpen.value = true
}

const onConfirmImport = async () => {
  if (importing.value) return
  importing.value = true
  try {
    const { importAll } = useDataImport()
    await importAll(importData.value, { mode: importMode.value })
    notify.success(t('settings.account.io.imported'))
    confirmInputImport.value = ''
    importData.value = null
    importFile.value = null
  } catch {
    notify.error(t('settings.account.io.importError'))
  } finally {
    importing.value = false
    importConfirmOpen.value = false
  }
}
</script>

<template>
  <article class="card">
    <h2 class="card-title">
      {{ t('settings.account.title') }}
    </h2>
    <p class="card-subtitle">
      {{ t('settings.account.subtitle') }}
    </p>

    <div class="account-actions">
      <button
        class="button"
        type="button"
        :disabled="!email || sending"
        :aria-busy="sending"
        @click="onResetPassword"
      >
        {{ sending ? t('common.loading') : t('settings.account.changePassword') }}
      </button>
      <small class="muted" v-if="email">
        {{ email }}
      </small>
    </div>

    <div class="io-zone">
      <h3 class="io-title">
        {{ t('settings.account.io.title') }}
      </h3>
      <p class="io-subtitle">
        {{ t('settings.account.io.subtitle') }}
      </p>
      <div class="io-actions">
        <button
          class="button"
          type="button"
          :aria-busy="exporting"
          :disabled="exporting || !canWrite"
          :title="!canWrite ? t('access.readOnly') : ''"
          @click="onExport"
        >
          {{ exporting ? t('common.loading') : t('settings.account.io.export') }}
        </button>
        <label
          class="file-btn"
          :title="!canWrite ? t('access.readOnly') : ''"
        >
          <input
            type="file"
            accept="application/json"
            @change="onPickFile"
            :disabled="!canWrite"
          />
          <span>
            {{ t('settings.account.io.pickFile') }}
          </span>
        </label>
        <select
          class="input"
          v-model="importMode"
          :disabled="!canWrite"
        >
          <option value="merge">
            {{ t('settings.account.io.mode.merge') }}
          </option>
          <option value="replace">
            {{ t('settings.account.io.mode.replace') }}
          </option>
        </select>
        <input
          v-if="requireWordForReplace"
          class="input input-inline"
          v-model="confirmInputImport"
          :placeholder="t('settings.account.delete.inputPlaceholder', { word: confirmWordImport })"
          :disabled="!canWrite"
        />
        <button
          class="button button-secondary"
          type="button"
          :aria-busy="importing"
          :disabled="!canWrite || importing || !importData || !isUnlockImport"
          @click="onRequestImport"
          :title="!canWrite ? t('access.readOnly') : ''"
        >
          {{ importing ? t('common.loading') : t('settings.account.io.import') }}
        </button>
      </div>
      <div
        v-if="importData"
        class="import-preview"
      >
        <h4 class="import-title">
          {{ t('settings.account.io.preview') }}
        </h4>
        <ul class="import-list">
          <li
            v-for="it in importCounts.entries"
            :key="it.name"
            class="import-item"
          >
            <span class="name">
              {{ it.name }}
            </span>
            <span class="count">
              {{ it.count }}
            </span>
          </li>
        </ul>
        <div class="import-total">
          <span class="label">
            {{ t('common.total') }}
          </span>
          <span class="value">
            {{ importCounts.total }}
          </span>
        </div>
      </div>
    </div>

    <div class="danger-zone">
      <h3 class="danger-title">
        {{ t('settings.account.delete.title') }}
      </h3>
      <p class="danger-subtitle">
        {{ t('settings.account.delete.subtitle') }}
      </p>
      <div class="form-field">
        <label>
          {{ t('settings.account.delete.typeToEnable', { word: confirmWord }) }}
        </label>
        <input
          class="input"
          v-model="confirmInput"
          :placeholder="t('settings.account.delete.inputPlaceholder', { word: confirmWord })"
        />
      </div>
      <button
        class="button button-danger"
        type="button"
        :disabled="!canWrite || deleting || !isUnlock"
        :aria-busy="deleting"
        :title="!canWrite ? t('access.readOnly') : ''"
        @click="onRequestDelete"
      >
        {{ deleting ? t('common.loading') : t('settings.account.delete.action') }}
      </button>
    </div>

    <FCConfirmModal
      v-model:open="confirmOpen"
      :title="t('settings.account.delete.confirmTitle')"
      :message="t('settings.account.delete.confirmMessage')"
      :confirm-text="t('settings.account.delete.confirmCta')"
      :cancel-text="t('common.cancel')"
      :confirm-disabled="deleting"
      @confirm="onConfirmDelete"
    />

    <FCConfirmModal
      v-model:open="importConfirmOpen"
      :title="t('settings.account.io.confirmTitle')"
      :message="t('settings.account.io.confirmMessage')"
      :confirm-text="t('settings.account.io.import')"
      :cancel-text="t('common.cancel')"
      :confirm-disabled="importing"
      @confirm="onConfirmImport"
    />
  </article>
</template>

<style scoped>
.account-actions {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-wrap: wrap;
}
.muted {
  color: var(--muted-text-color);
}
.io-zone {
  margin-top: 1rem;
  padding-top: .75rem;
  border-top: 1px dashed var(--secondary-color);
  display: grid;
  gap: .5rem;
}
.io-title {
  margin: 0;
  font-size: 1rem;
}
.io-subtitle {
  margin: 0;
  color: var(--muted-text-color);
}
.io-actions {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
  align-items: center;
}
.file-btn {
  position: relative;
  overflow: hidden;
  display: inline-block;
}
.file-btn input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.file-btn input[type="file"][disabled] {
  pointer-events: none;
}
.file-btn span {
  display: inline-block;
  padding: .65rem 1rem;
  border-radius: 8px;
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  color: var(--text-color);
}
.input-inline {
  max-width: 240px;
}
.import-preview {
  display: grid;
  gap: .4rem;
  background: var(--secondary-color);
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  padding: .5rem .75rem;
}
.import-title {
  margin: 0;
  font-size: .95rem;
}
.import-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: .25rem;
}
.import-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .95rem;
}
.import-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.danger-zone {
  margin-top: 1rem;
  padding-top: .75rem;
  border-top: 1px dashed var(--secondary-color);
  display: grid;
  gap: .5rem;
}
.danger-title {
  margin: 0;
  font-size: 1rem;
  color: var(--error-color);
}
.danger-subtitle {
  margin: 0;
  color: var(--muted-text-color);
}
.button-danger {
  background: var(--error-color);
  color: var(--white);
  border-color: color-mix(in srgb, var(--error-color) 70%, var(--secondary-color));
}
.button-danger:hover {
  filter: brightness(0.95);
}
.button-danger[disabled] {
  opacity: .6;
  cursor: not-allowed;
}
.form-field {
  display: grid;
  gap: .4rem;
}
.input {
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  padding: .65rem .75rem;
  border-radius: 8px;
  color: var(--text-color);
}
.input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}
</style>
