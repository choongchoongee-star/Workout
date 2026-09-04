import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

const DATA_FILE = 'workout-data.json'
const WEB_STORAGE_KEY = 'wl_workout_data_v1'

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

function isMissingFile(error) {
  return error?.code === 'OS-PLUG-FILE-0008' || /does not exist|not found/i.test(error?.message || '')
}

export async function loadLocalWorkoutData() {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.readFile({
        path: DATA_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      })
      return parseLocalWorkoutData(result.data)
    } catch (error) {
      if (isMissingFile(error)) return null
      throw error
    }
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY)
  return raw ? parseLocalWorkoutData(raw) : null
}

export async function saveLocalWorkoutData(data) {
  const serialized = serialize(data)
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: DATA_FILE,
      data: serialized,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    return
  }
  localStorage.setItem(WEB_STORAGE_KEY, serialized)
}
