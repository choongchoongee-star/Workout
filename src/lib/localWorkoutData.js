import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

const DATA_FILE = 'workout-data.json'
const BACKUP_FILE = 'workout-data.backup.json'
const TEMP_FILE = 'workout-data.pending.json'
const WEB_STORAGE_KEY = 'wl_workout_data_v1'
const WEB_BACKUP_KEY = 'wl_workout_data_backup_v1'
const WEB_TEMP_KEY = 'wl_workout_data_pending_v1'

function serialize(data) {
  return JSON.stringify({ version: 1, exercises: data.exercises, sessions: data.sessions })
}

export function parseLocalWorkoutData(raw) {
  const data = JSON.parse(raw)
  if (!data || !Array.isArray(data.exercises) || !Array.isArray(data.sessions)) {
    throw new Error('The local workout file is invalid.')
  }
  return { exercises: data.exercises, sessions: data.sessions }
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

export async function loadLocalWorkoutData() {
  if (Capacitor.isNativePlatform()) {
    return loadNativeWorkoutData()
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

export async function saveLocalWorkoutData(data) {
  const serialized = serialize(data)
  if (Capacitor.isNativePlatform()) {
    await saveNativeWorkoutData(data)
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
