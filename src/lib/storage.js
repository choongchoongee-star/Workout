// localStorage helpers — only for settings and API keys (never workout data)

const KEYS = {
  GITHUB_TOKEN: 'wl_github_token',
  GIST_ID: 'wl_gist_id',
  GEMINI_KEY: 'wl_gemini_key',
  BODY_WEIGHT: 'wl_body_weight',
  HEIGHT: 'wl_height',
  REST_SECONDS: 'wl_rest_seconds',
}

/** Check localStorage availability (may be unavailable in private/incognito on some browsers) */
function isAvailable() {
  try {
    const key = '__wl_test__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

function safeGet(key) {
  if (!isAvailable()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  if (!isAvailable()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    console.warn(`localStorage write failed for key: ${key}`)
  }
}

function safeFloat(raw, fallback) {
  const v = parseFloat(raw)
  return isFinite(v) && v > 0 ? v : fallback
}

function safeInt(raw, fallback) {
  const v = parseInt(raw, 10)
  return isFinite(v) && v > 0 ? v : fallback
}

export const storage = {
  isAvailable,

  getGithubToken: () => safeGet(KEYS.GITHUB_TOKEN) || '',
  setGithubToken: (v) => safeSet(KEYS.GITHUB_TOKEN, v),

  getGistId: () => safeGet(KEYS.GIST_ID) || '',
  setGistId: (v) => safeSet(KEYS.GIST_ID, v),

  getGeminiKey: () => safeGet(KEYS.GEMINI_KEY) || '',
  setGeminiKey: (v) => safeSet(KEYS.GEMINI_KEY, v),

  getBodyWeight: () => safeFloat(safeGet(KEYS.BODY_WEIGHT), 70),
  setBodyWeight: (v) => safeSet(KEYS.BODY_WEIGHT, String(v)),

  getHeight: () => safeFloat(safeGet(KEYS.HEIGHT), 170),
  setHeight: (v) => safeSet(KEYS.HEIGHT, String(v)),

  getRestSeconds: () => safeInt(safeGet(KEYS.REST_SECONDS), 90),
  setRestSeconds: (v) => safeSet(KEYS.REST_SECONDS, String(v)),
}
