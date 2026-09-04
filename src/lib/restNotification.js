import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const REST_NOTIFICATION_ID = 1101
let preparedAudioContext = null
let nativeNotificationScheduled = false
let scheduleGeneration = 0

function createBrowserAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  return AudioContext ? new AudioContext() : null
}

function browserVibrate(duration) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  return navigator.vibrate(duration)
}

export function prepareRestNotification(createContext = createBrowserAudioContext) {
  try {
    preparedAudioContext ??= createContext()
    if (!preparedAudioContext) return false
    if (preparedAudioContext.state === 'suspended') {
      preparedAudioContext.resume().catch(() => {})
    }
    return true
  } catch {
    return false
  }
}

export async function getRestNotificationPermission({
  isNativePlatform = () => Capacitor.isNativePlatform(),
  notifications = LocalNotifications,
} = {}) {
  if (!isNativePlatform()) return 'web'
  try {
    const permission = await notifications.checkPermissions()
    return permission.display || 'prompt'
  } catch {
    return 'unavailable'
  }
}

export async function requestRestNotificationPermission({
  isNativePlatform = () => Capacitor.isNativePlatform(),
  notifications = LocalNotifications,
} = {}) {
  if (!isNativePlatform()) return 'web'
  try {
    const permission = await notifications.requestPermissions()
    return permission.display || 'denied'
  } catch {
    return 'unavailable'
  }
}

export function playRestTone(context) {
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, now)
  gain.gain.setValueAtTime(0.16, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.25)
}

export async function scheduleRestNotification(endsAt, {
  isNativePlatform = () => Capacitor.isNativePlatform(),
  notifications = LocalNotifications,
} = {}) {
  if (!isNativePlatform()) return false
  const generation = ++scheduleGeneration
  nativeNotificationScheduled = false

  try {
    let permission = await notifications.checkPermissions()
    if (permission.display === 'prompt') {
      permission = await notifications.requestPermissions()
    }
    if (permission.display !== 'granted' || generation !== scheduleGeneration) return false

    await notifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] })
    if (generation !== scheduleGeneration) return false
    await notifications.schedule({
      notifications: [{
        id: REST_NOTIFICATION_ID,
        title: 'Rest complete',
        body: 'Time for your next set.',
        schedule: { at: new Date(endsAt) },
        sound: 'default',
        foreground: true,
      }],
    })
    nativeNotificationScheduled = generation === scheduleGeneration
    return nativeNotificationScheduled
  } catch {
    nativeNotificationScheduled = false
    return false
  }
}

export async function cancelRestNotification({
  isNativePlatform = () => Capacitor.isNativePlatform(),
  notifications = LocalNotifications,
} = {}) {
  scheduleGeneration += 1
  nativeNotificationScheduled = false
  if (!isNativePlatform()) return
  try {
    await notifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] })
  } catch {
    // A missing or already-delivered notification needs no further action.
  }
}

export async function notifyRestComplete({
  context = preparedAudioContext,
  createContext = createBrowserAudioContext,
  vibrate = browserVibrate,
} = {}) {
  if (Capacitor.isNativePlatform() && nativeNotificationScheduled) {
    nativeNotificationScheduled = false
    return 'native'
  }
  try {
    const audioContext = context || createContext()
    if (!audioContext) throw new Error('Web Audio is unavailable')
    if (audioContext.state === 'suspended') await audioContext.resume()
    if (audioContext.state && audioContext.state !== 'running') {
      throw new Error('Web Audio is not running')
    }
    preparedAudioContext = audioContext
    playRestTone(audioContext)
    return 'sound'
  } catch {
    return vibrate(250) ? 'vibration' : 'none'
  }
}
