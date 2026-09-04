import { Capacitor, registerPlugin } from '@capacitor/core'

const AppSettings = registerPlugin('AppSettings')

export async function openAppSettings({
  isNativePlatform = () => Capacitor.isNativePlatform(),
  settings = AppSettings,
} = {}) {
  if (!isNativePlatform()) return false

  try {
    await settings.open()
    return true
  } catch {
    return false
  }
}
