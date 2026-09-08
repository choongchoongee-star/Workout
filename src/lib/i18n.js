import { ko } from './translations.js'

let language = 'en'
export function resolveLanguage(preferences = []) {
  for (const preference of preferences) {
    const base = String(preference).toLowerCase().split(/[-_]/)[0]
    if (base === 'ko' || base === 'en') return base
  }
  return 'en'
}
export function setLanguage(value) { language = resolveLanguage([value]) }
export function getLanguage() { return language }
export function getLocale() { return language === 'ko' ? 'ko-KR' : 'en-US' }
export function t(message, values = {}) {
  const translated = language === 'ko' && Object.hasOwn(ko, message) ? ko[message] : message
  return translated?.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
