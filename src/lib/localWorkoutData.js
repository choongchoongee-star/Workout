import { Capacitor } from '@capacitor/core'
import { normalizeSessionEquipment } from './equipment.js'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

const DATA_FILE = 'workout-data.json'
const BACKUP_FILE = 'workout-data.backup.json'
const TEMP_FILE = 'workout-data.pending.json'
const JOURNAL_FILE = 'workout-data.journal.json'
const WEB_STORAGE_KEY = 'wl_workout_data_v1'
const WEB_BACKUP_KEY = 'wl_workout_data_backup_v1'
const WEB_TEMP_KEY = 'wl_workout_data_pending_v1'
const NATIVE_JOURNAL_KEY = 'wl_native_workout_journal_v1'
let nativeSaveQueue = Promise.resolve()

function getJournalStorage() {
  try { return globalThis.localStorage } catch { return null }
}

function serialize(data) {
  return JSON.stringify({ version: 1, exercises: data.exercises, sessions: data.sessions })
}

export function parseLocalWorkoutData(raw) {
  const data = JSON.parse(raw)
  if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.sessions)) {
    throw new Error('The local workout file is invalid.')
  }
  return { exercises: data.exercises, sessions: data.sessions.map(normalizeSessionEquipment) }
}

async function readNativeFile(path, filesystem = Filesystem) {
  const result = await filesystem.readFile({
    path,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
  return parseLocalWorkoutData(result.data)
}

async function restoreNativeBackup(filesystem = Filesystem) {
  const result = await filesystem.readFile({
    path: BACKUP_FILE,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
  const data = parseLocalWorkoutData(result.data)
  await filesystem.writeFile({
    path: DATA_FILE,
    data: result.data,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
  return data
}

export async function loadNativeWorkoutData(filesystem = Filesystem) {
  let pending
  try { pending = await readNativeFile(TEMP_FILE, filesystem) } catch { /* Incomplete writes cannot replace verified data. */ }
  if (pending) {
    await saveNativeWorkoutData(pending, filesystem)
    return { data: pending, recoveredFromBackup: false }
  }
  try {
    return { data: await readNativeFile(DATA_FILE, filesystem), recoveredFromBackup: false }
  } catch (primaryError) {
    try {
      return { data: await restoreNativeBackup(filesystem), recoveredFromBackup: true }
    } catch {
      if (isMissingFile(primaryError)) return { data: null, recoveredFromBackup: false }
      throw primaryError
    }
  }
}

function isMissingFile(error) {
  return error?.code === 'OS-PLUG-FILE-0008' || /does not exist|not found/i.test(error?.message || '')
}

export async function loadLocalWorkoutData({ native = Capacitor.isNativePlatform(), filesystem = Filesystem, journalStorage = getJournalStorage(), nativeJournal = globalThis.WorkoutJournal } = {}) {
  if (native) {
    let journal
    if (nativeJournal) {
      try { journal = await readNativeFile(JOURNAL_FILE, filesystem) } catch { /* No complete native journal; use the existing recovery paths. */ }
    }
    try {
      const raw = journalStorage.getItem(NATIVE_JOURNAL_KEY)
      if (!journal && raw) journal = parseLocalWorkoutData(raw)
    } catch { /* Native files remain available if WebView storage is unavailable or corrupt. */ }
    if (journal) {
      await saveLocalWorkoutData(journal, { native, filesystem, journalStorage, nativeJournal })
      return { data: journal, recoveredFromBackup: false }
    }
    return loadNativeWorkoutData(filesystem)
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY)
  if (!raw) {
    const backup = localStorage.getItem(WEB_BACKUP_KEY)
    if (!backup) return { data: null, recoveredFromBackup: false }
    const data = parseLocalWorkoutData(backup)
    localStorage.setItem(WEB_STORAGE_KEY, backup)
    return { data, recoveredFromBackup: true }
  }
  try {
    return { data: parseLocalWorkoutData(raw), recoveredFromBackup: false }
  } catch (primaryError) {
    const backup = localStorage.getItem(WEB_BACKUP_KEY)
    if (!backup) throw primaryError
    const data = parseLocalWorkoutData(backup)
    localStorage.setItem(WEB_STORAGE_KEY, backup)
    return { data, recoveredFromBackup: true }
  }
}

export async function saveNativeWorkoutData(data, filesystem = Filesystem) {
  const serialized = serialize(data)
  await filesystem.writeFile({
    path: TEMP_FILE,
    data: serialized,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
  await readNativeFile(TEMP_FILE, filesystem)

  let hasSafeBackup = false
  try {
    const current = await filesystem.readFile({
      path: DATA_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    parseLocalWorkoutData(current.data)
    await filesystem.writeFile({
      path: BACKUP_FILE,
      data: current.data,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    hasSafeBackup = true
  } catch {
    // Keep the existing verified backup when the primary file is absent or invalid.
    try {
      await readNativeFile(BACKUP_FILE, filesystem)
      hasSafeBackup = true
    } catch {
      // The first successful save creates the initial safe backup below.
    }
  }

  await filesystem.writeFile({
    path: DATA_FILE,
    data: serialized,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })
  await readNativeFile(DATA_FILE, filesystem)
  if (!hasSafeBackup) {
    await filesystem.writeFile({
      path: BACKUP_FILE,
      data: serialized,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    await readNativeFile(BACKUP_FILE, filesystem)
  }
  try {
    await filesystem.deleteFile({ path: TEMP_FILE, directory: Directory.Data })
  } catch {
    // A leftover verified pending file is harmless and may aid manual recovery.
  }
}

export async function saveLocalWorkoutData(data, { native = Capacitor.isNativePlatform(), filesystem = Filesystem, journalStorage = getJournalStorage(), nativeJournal = globalThis.WorkoutJournal } = {}) {
  const serialized = serialize(data)
  if (native) {
    // Record the newest snapshot synchronously before awaiting the native bridge.
    // Older queued writes must never clear a newer recovery journal.
    if (nativeJournal) {
      if (!nativeJournal.write(serialized)) throw new Error('Could not save the workout recovery journal.')
    } else if (journalStorage) {
      try { journalStorage.setItem(NATIVE_JOURNAL_KEY, serialized) } catch (error) {
        // A stale journal must not roll back a newer successful native save.
        try { journalStorage.removeItem(NATIVE_JOURNAL_KEY) } catch { throw error }
      }
    }
    const snapshot = parseLocalWorkoutData(serialized)
    const save = nativeSaveQueue.then(() => saveNativeWorkoutData(snapshot, filesystem))
    nativeSaveQueue = save.catch(() => {})
    await save
    if (nativeJournal) nativeJournal.clear(serialized)
    try {
      if (nativeJournal || journalStorage.getItem(NATIVE_JOURNAL_KEY) === serialized) journalStorage.removeItem(NATIVE_JOURNAL_KEY)
    } catch { /* A retained journal can safely be replayed on the next launch. */ }
    return
  }

  localStorage.setItem(WEB_TEMP_KEY, serialized)
  parseLocalWorkoutData(localStorage.getItem(WEB_TEMP_KEY))
  const current = localStorage.getItem(WEB_STORAGE_KEY)
  let hasSafeBackup = false
  if (current) {
    try {
      parseLocalWorkoutData(current)
      localStorage.setItem(WEB_BACKUP_KEY, current)
      hasSafeBackup = true
    } catch {
      // Keep the existing verified backup when the primary value is invalid.
    }
  }
  if (!hasSafeBackup) {
    const backup = localStorage.getItem(WEB_BACKUP_KEY)
    if (backup) {
      try {
        parseLocalWorkoutData(backup)
        hasSafeBackup = true
      } catch {
        // A corrupt backup is replaced after the new primary value is verified.
      }
    }
  }
  localStorage.setItem(WEB_STORAGE_KEY, serialized)
  parseLocalWorkoutData(localStorage.getItem(WEB_STORAGE_KEY))
  if (!hasSafeBackup) localStorage.setItem(WEB_BACKUP_KEY, serialized)
  localStorage.removeItem(WEB_TEMP_KEY)
}
