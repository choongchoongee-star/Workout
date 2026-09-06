import { storage } from './storage'

export function applyTheme(theme = storage.getTheme()) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1b262c' : '#f7eae0')
}
