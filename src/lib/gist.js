import { DEFAULT_EXERCISES } from '../data/exercises'

const API = 'https://api.github.com'
const GIST_FILENAME = 'workout_data.json'

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function githubError(status) {
  if (status === 401) return 'GitHub 토큰이 유효하지 않습니다'
  if (status === 403) return 'GitHub API 접근 권한이 없습니다'
  if (status === 404) return 'Gist를 찾을 수 없습니다. Gist ID를 확인하세요'
  if (status === 422) return 'GitHub API 요청 형식 오류입니다'
  return `GitHub API 오류 (${status})`
}

/** Validate and sanitize loaded data shape */
function validateData(raw) {
  return {
    exercises: Array.isArray(raw?.exercises) ? raw.exercises : DEFAULT_EXERCISES,
    sessions: Array.isArray(raw?.sessions) ? raw.sessions : [],
    inbody: Array.isArray(raw?.inbody) ? raw.inbody : [],
  }
}

export async function createGist(token) {
  const initialData = { exercises: DEFAULT_EXERCISES, sessions: [], inbody: [] }
  const body = {
    description: 'Workout Logger Data',
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(initialData, null, 2),
      },
    },
  }
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(githubError(res.status))
  const data = await res.json()
  return data.id
}

export async function loadGist(token, gistId) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(githubError(res.status))

  const data = await res.json()
  const content = data.files[GIST_FILENAME]?.content
  if (!content) throw new Error(`Gist에서 ${GIST_FILENAME} 파일을 찾을 수 없습니다`)

  try {
    const parsed = JSON.parse(content)
    return validateData(parsed)
  } catch {
    throw new Error('Gist 데이터가 손상되었습니다. 설정에서 새 Gist를 생성하세요')
  }
}

export async function saveGist(token, gistId, workoutData) {
  const body = {
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(workoutData, null, 2),
      },
    },
  }
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(githubError(res.status))
}

export async function testConnection(token, gistId) {
  if (!token) throw new Error('GitHub 토큰이 없습니다')
  if (!gistId) {
    const res = await fetch(`${API}/gists`, { headers: headers(token) })
    if (!res.ok) throw new Error(githubError(res.status))
    return
  }
  await loadGist(token, gistId)
}
