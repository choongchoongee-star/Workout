// localStorage helpers — 설정값과 API 키 전용 (운동 데이터는 Firestore에 저장)

const KEYS = {
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

  getGeminiKey: () => safeGet(KEYS.GEMINI_KEY) || '',
  setGeminiKey: (v) => safeSet(KEYS.GEMINI_KEY, v),

  getBodyWeight: () => safeFloat(safeGet(KEYS.BODY_WEIGHT), 70),
  setBodyWeight: (v) => safeSet(KEYS.BODY_WEIGHT, String(v)),

  getHeight: () => safeFloat(safeGet(KEYS.HEIGHT), 170),
  setHeight: (v) => safeSet(KEYS.HEIGHT, String(v)),

  getRestSeconds: () => safeInt(safeGet(KEYS.REST_SECONDS), 90),
  setRestSeconds: (v) => safeSet(KEYS.REST_SECONDS, String(v)),
}
