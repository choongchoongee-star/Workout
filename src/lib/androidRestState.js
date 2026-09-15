const KEY = 'wl_android_rest_timer'

// A deadline survives a WebView/process restart without extending the rest period.
export function createAndroidRestState(getStorage = () => localStorage) {
  function clear() {
    try { getStorage().removeItem(KEY) } catch { /* Storage can be unavailable. */ }
  }
  return {
    save(state) {
      try { getStorage().setItem(KEY, JSON.stringify(state)) } catch { /* Timer still runs in memory. */ }
    },
    clear,
    read(now = Date.now()) {
      try {
        const state = JSON.parse(getStorage().getItem(KEY))
        if (state && typeof state.timerID === 'string' && state.timerID.length > 0 &&
            Number.isFinite(state.startedAt) && Number.isFinite(state.endsAt) &&
            state.endsAt > state.startedAt && state.endsAt > now) {
          return { ...state, status: 'active' }
        }
      } catch { /* Ignore malformed or unavailable storage. */ }
      clear()
      return null
    },
  }
}

export const androidRestState = createAndroidRestState()
