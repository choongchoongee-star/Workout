// localStorage helpers — only for settings and API keys (never workout data)

const KEYS = {
  GITHUB_TOKEN: 'wl_github_token',
  GIST_ID: 'wl_gist_id',
  GEMINI_KEY: 'wl_gemini_key',
  BODY_WEIGHT: 'wl_body_weight',
  REST_SECONDS: 'wl_rest_seconds',
}

export const storage = {
  getGithubToken: () => localStorage.getItem(KEYS.GITHUB_TOKEN) || '',
  setGithubToken: (v) => localStorage.setItem(KEYS.GITHUB_TOKEN, v),

  getGistId: () => localStorage.getItem(KEYS.GIST_ID) || '',
  setGistId: (v) => localStorage.setItem(KEYS.GIST_ID, v),

  getGeminiKey: () => localStorage.getItem(KEYS.GEMINI_KEY) || '',
  setGeminiKey: (v) => localStorage.setItem(KEYS.GEMINI_KEY, v),

  getBodyWeight: () => parseFloat(localStorage.getItem(KEYS.BODY_WEIGHT)) || 70,
  setBodyWeight: (v) => localStorage.setItem(KEYS.BODY_WEIGHT, String(v)),

  getRestSeconds: () => parseInt(localStorage.getItem(KEYS.REST_SECONDS)) || 90,
  setRestSeconds: (v) => localStorage.setItem(KEYS.REST_SECONDS, String(v)),
}
