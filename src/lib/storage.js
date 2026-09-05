// localStorage helpers for lightweight device settings.

const KEYS = {
  BODY_WEIGHT: 'wl_body_weight',
  REST_SECONDS: 'wl_rest_seconds',
  WEIGHT_UNIT: 'wl_weight_unit',
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

export const storage = {
  isAvailable,
  getEquipment: (family) => safeGet(`wl_equipment_${family}`),
  setEquipment: (family, equipment) => safeSet(`wl_equipment_${family}`, equipment),
  getWeightUnit: () => safeGet(KEYS.WEIGHT_UNIT) === 'lbs' ? 'lbs' : 'kg',
  setWeightUnit: (v) => safeSet(KEYS.WEIGHT_UNIT, v === 'lbs' ? 'lbs' : 'kg'),

  getBodyWeight: () => safeFloat(safeGet(KEYS.BODY_WEIGHT), 70),
  setBodyWeight: (v) => safeSet(KEYS.BODY_WEIGHT, String(v)),

  getRestSeconds: () => {
    const v = parseInt(safeGet(KEYS.REST_SECONDS), 10)
    return isFinite(v) && v >= 0 ? v : 90
  },
  setRestSeconds: (v) => safeSet(KEYS.REST_SECONDS, String(v)),
}
