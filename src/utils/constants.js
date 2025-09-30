/**
 * Application constants
 * 
 * This file contains constants used throughout the application
 * to maintain consistency and make them easily configurable.
 */

// Backup and export related constants
export const BACKUP_FILENAME_PREFIX = 'fincontrol-backup'
export const BACKUP_FILE_EXTENSION = '.json'

// Complete filename pattern for exports
export const getBackupFilename = (timestamp) => {
  const ts = timestamp || new Date().toISOString().replace(/[:.]/g, '-')
  return `${BACKUP_FILENAME_PREFIX}-${ts}${BACKUP_FILE_EXTENSION}`
}