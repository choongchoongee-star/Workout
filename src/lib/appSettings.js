import { Capacitor, registerPlugin } from '@capacitor/core'

const AppSettings = registerPlugin('AppSettings')

export async function openAppSettings({
  notifications = false,
  isNativePlatform = () => Capacitor.isNativePlatform(),
  settings = AppSettings,
} = {}) {
  if (!isNativePlatform()) return false

  try {
    await settings.open({ notifications })
    return true
  } catch {
    return false
  }
}
