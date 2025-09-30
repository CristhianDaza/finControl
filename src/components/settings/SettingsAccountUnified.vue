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
import { getBackupFilename } from '@/utils/constants.js'

const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fCConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))

const store = useAuthStore()
const notify = useNotify()

const planExpiresAtDisplay = computed(() => {
  const exp = store.profile?.planExpiresAt
  if (!exp) return '—'
  const ms = exp.toMillis ? exp.toMillis() : exp
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString()
  } catch {
    return '—'
  }
})

const showCodeInput = ref(false)
const codeValue = ref('')
const validating = ref(false)
const codeMsg = ref('')
const codeError = ref(false)

const applyCode = async () => {
  if (!codeValue.value || validating.value) return
  validating.value = true
  codeMsg.value = ''
  codeError.value = false
  const res = await store.applyCodeAndRefresh(codeValue.value)
  validating.value = false
  if (res.ok) {
    codeMsg.value = t('settings.code.success', { date: planExpiresAtDisplay.value })
    codeValue.value = ''
    codeError.value = false
  } else {
    codeMsg.value = res.error || t('errors.generic')
    codeError.value = true
  }
}

const codeInputClass = computed(() => {
  if (codeError.value) return 'code-input-error'
  if (!codeError.value && codeMsg.value && !codeValue.value) return 'code-input-success'
  return ''
})

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

const exporting = ref(false)
const importing = ref(false)
const importMode = ref('merge')
const importFile = ref(null)
const importData = ref(null)
const importConfirmOpen = ref(false)
const canWrite = computed(() => store.canWrite)

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
    a.download = getBackupFilename(ts)
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

const confirmOpen = ref(false)
const deleting = ref(false)
const { deleteAllUserData } = useDataCleanup()

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
</script>

<template>
  <article class="unified-account-settings">
    <section class="account-status-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('settings.accountStatus') }}</h2>
        <div class="status-badge" :class="{ active: !store.isReadOnly, inactive: store.isReadOnly }">
          {{ store.isReadOnly ? t('settings.accountStatusInactive') : t('settings.accountStatusActive') }}
        </div>
      </div>

      <div class="account-info">
        <div class="info-item">
          <span class="info-label">{{ t('settings.expiresAt') }}:</span>
          <span class="info-value">{{ planExpiresAtDisplay }}</span>
        </div>
        <p class="account-instructions">
          {{ store.isReadOnly ? t('settings.planInstructions.inactive') : t('settings.planInstructions.active') }}
        </p>
      </div>

      <div class="code-actions">
        <button
          class="button button-primary"
          type="button"
          @click="showCodeInput = !showCodeInput"
        >
          {{ t('settings.enterCode') }}
        </button>
        <button
          class="button button-secondary"
          type="button"
          :disabled="!store.canWrite"
          :title="!store.canWrite ? t('access.readOnly') : ''"
        >
          {{ t('settings.generateCode') }}
        </button>
      </div>

      <div v-if="showCodeInput" class="code-input-section">
        <div class="form-field">
          <label class="field-label">{{ t('auth.signup.code') }}</label>
          <div class="input-group">
            <input
              class="input code-input"
              :class="codeInputClass"
              v-model="codeValue"
              :placeholder="t('auth.signup.code-placeholder')"
              :disabled="validating"
              maxlength="24"
            />
            <button
              class="button button-primary"
              type="button"
              @click="applyCode"
              :disabled="!codeValue || validating"
              :aria-busy="validating"
            >
              {{ validating ? t('common.loading') : t('settings.validateCode') }}
            </button>
          </div>
          <small
            v-if="codeMsg"
            :class="{ 'text-success': !codeError, 'text-error': codeError }"
          >
            {{ codeMsg }}
          </small>
        </div>
      </div>
    </section>

    <section class="security-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('settings.account.title') }}</h2>
      </div>

      <div class="security-info">
        <div class="info-item">
          <span class="info-label">{{ t('settings.account.email') }}:</span>
          <span class="info-value">{{ email }}</span>
        </div>
      </div>

      <div class="security-actions">
        <button
          class="button button-secondary"
          type="button"
          :disabled="!email || sending"
          :aria-busy="sending"
          @click="onResetPassword"
        >
          {{ sending ? t('common.loading') : t('settings.account.changePassword') }}
        </button>
      </div>
    </section>

    <section class="data-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('settings.account.io.title') }}</h2>
      </div>

      <p class="section-description">{{ t('settings.account.io.subtitle') }}</p>

      <div class="data-actions">
        <button
          class="button button-primary"
          type="button"
          :aria-busy="exporting"
          :disabled="exporting || !canWrite"
          :title="!canWrite ? t('access.readOnly') : ''"
          @click="onExport"
        >
          {{ exporting ? t('common.loading') : t('settings.account.io.export') }}
        </button>

        <div class="import-controls">
          <label class="file-button" :title="!canWrite ? t('access.readOnly') : ''">
            <input
              type="file"
              accept="application/json"
              @change="onPickFile"
              :disabled="!canWrite"
            />
            <span>{{ t('settings.account.io.pickFile') }}</span>
          </label>

          <select
            class="input select-input"
            v-model="importMode"
            :disabled="!canWrite"
          >
            <option value="merge">{{ t('settings.account.io.mode.merge') }}</option>
            <option value="replace">{{ t('settings.account.io.mode.replace') }}</option>
          </select>

          <input
            v-if="requireWordForReplace"
            class="input"
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
      </div>

      <div v-if="importData" class="import-preview">
        <h4 class="preview-title">{{ t('settings.account.io.preview') }}</h4>
        <div class="preview-content">
          <ul class="preview-list">
            <li v-for="item in importCounts.entries" :key="item.name" class="preview-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-count">{{ item.count }}</span>
            </li>
          </ul>
          <div class="preview-total">
            <span class="total-label">{{ t('common.total') }}</span>
            <span class="total-value">{{ importCounts.total }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="danger-section">
      <div class="section-header">
        <h2 class="section-title danger-title">{{ t('settings.account.delete.title') }}</h2>
      </div>

      <p class="section-description">{{ t('settings.account.delete.subtitle') }}</p>

      <div class="form-field">
        <label class="field-label">
          {{ t('settings.account.delete.typeToEnable', { word: confirmWord }) }}
        </label>
        <input
          class="input danger-input"
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
    </section>

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
.unified-account-settings {
  display: grid;
  gap: 2rem;
  width: 100%;
}

.account-status-section,
.security-section,
.data-section,
.danger-section {
  background: var(--primary-color);
  border: 1px solid var(--secondary-color);
  border-radius: 12px;
  padding: 1.5rem;
  display: grid;
  gap: 1rem;
  box-shadow: 0 2px 8px var(--shadow-elev-2);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-description {
  margin: 0;
  color: var(--muted-text-color);
  line-height: 1.5;
}

/* Estado de cuenta */
.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.active {
  background: color-mix(in srgb, var(--success-color) 15%, transparent);
  color: var(--success-color);
  border: 1px solid color-mix(in srgb, var(--success-color) 30%, transparent);
}

.status-badge.inactive {
  background: color-mix(in srgb, var(--warning-color) 15%, transparent);
  color: var(--warning-color);
  border: 1px solid color-mix(in srgb, var(--warning-color) 30%, transparent);
}

.account-info {
  display: grid;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.info-label {
  font-weight: 500;
  color: var(--text-color);
  min-width: 120px;
}

.info-value {
  color: var(--muted-text-color);
}

.account-instructions {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-text-color);
  line-height: 1.4;
  background: var(--secondary-color);
  padding: 0.75rem;
  border-radius: 8px;
  border-left: 3px solid var(--accent-color);
}

.code-actions,
.security-actions,
.data-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.data-actions {
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
}

.import-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.code-input-section {
  background: var(--secondary-color);
  padding: 1rem;
  border-radius: 8px;
  border: 1px dashed var(--primary-color);
}

.form-field {
  display: grid;
  gap: 0.5rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
}

.input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input {
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  padding: 0.75rem;
  border-radius: 8px;
  color: var(--text-color);
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--focus-accent-glow);
}

.code-input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.select-input {
  min-width: 140px;
}

.code-input-success {
  border-color: var(--success-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--success-color) 25%, transparent);
}

.code-input-error {
  border-color: var(--error-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--error-color) 25%, transparent);
}

.button {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  min-height: 44px;
}

.button-primary {
  background: var(--accent-color);
  color: var(--white);
  border-color: var(--accent-color);
}

.button-primary:hover:not([disabled]) {
  background: var(--hover-accent-color);
  transform: translateY(-1px);
}

.button-secondary {
  background: var(--secondary-color);
  color: var(--text-color);
  border-color: var(--primary-color);
}

.button-secondary:hover:not([disabled]) {
  background: var(--hover-secondary-color);
}

.button-danger {
  background: var(--error-color);
  color: var(--white);
  border-color: var(--error-color);
}

.button-danger:hover:not([disabled]) {
  background: var(--hover-error-color);
}

.button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.file-button {
  position: relative;
  overflow: hidden;
  display: inline-block;
  cursor: pointer;
}

.file-button input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-button span {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  background: var(--secondary-color);
  border: 1px solid var(--primary-color);
  color: var(--text-color);
  font-weight: 500;
  transition: all 0.2s ease;
}

.file-button:hover span {
  background: var(--hover-secondary-color);
}

.import-preview {
  background: var(--secondary-color);
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  padding: 1rem;
}

.preview-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 500;
}

.preview-content {
  display: grid;
  gap: 0.75rem;
}

.preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--primary-color);
}

.preview-item:last-child {
  border-bottom: none;
}

.item-name {
  font-weight: 500;
}

.item-count {
  color: var(--muted-text-color);
  font-variant-numeric: tabular-nums;
}

.preview-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  padding-top: 0.75rem;
  border-top: 2px solid var(--primary-color);
}

.danger-section {
  border-color: color-mix(in srgb, var(--error-color) 30%, var(--secondary-color));
}

.danger-title {
  color: var(--error-color) !important;
}

.danger-input {
  border-color: color-mix(in srgb, var(--error-color) 30%, var(--primary-color));
}

.danger-input:focus {
  border-color: var(--error-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--error-color) 25%, transparent);
}

.text-success {
  color: var(--success-color);
}

.text-error {
  color: var(--error-color);
}

@media (max-width: 768px) {
  .unified-account-settings {
    gap: 1.5rem;
  }

  .account-status-section,
  .security-section,
  .data-section,
  .danger-section {
    padding: 1rem;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .input-group {
    flex-direction: column;
  }

  .code-actions,
  .security-actions,
  .import-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-label {
    min-width: auto;
  }
}
</style>
