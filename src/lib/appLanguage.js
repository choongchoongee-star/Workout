import { Capacitor, registerPlugin } from '@capacitor/core'
import { resolveLanguage, setLanguage } from './i18n.js'

const settings = registerPlugin('AppSettings')

export async function initializeLanguage({
  native = Capacitor.isNativePlatform(),
  bridge = settings,
  preferences = globalThis.navigator?.languages ?? [],
} = {}) {
  let language = resolveLanguage(preferences)
  if (native) {
    // WebKit's navigator.language may describe the phone rather than the app.
    // Bundle.preferredLocalizations is authoritative for the iOS per-app choice.
    try { language = resolveLanguage([(await bridge.getLanguage()).language]) }
    catch { /* Older binaries retain a safe browser-language fallback. */ }
  }
  setLanguage(language)
  if (globalThis.document) document.documentElement.lang = language
  return language
}
