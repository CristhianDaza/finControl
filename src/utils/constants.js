export const BACKUP_FILENAME_PREFIX = 'fincontrol-backup'
export const BACKUP_FILE_EXTENSION = '.json'

export const getBackupFilename = (timestamp) => {
  const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-')
  return `${BACKUP_FILENAME_PREFIX}-${ts}${BACKUP_FILE_EXTENSION}`
}