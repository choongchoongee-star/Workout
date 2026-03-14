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

export async function createGist(token) {
  const body = {
    description: 'Workout Logger Data',
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify({ exercises: DEFAULT_EXERCISES, sessions: [] }, null, 2),
      },
    },
  }
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function loadGist(token, gistId) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json()
  const content = data.files[GIST_FILENAME]?.content
  if (!content) throw new Error('workout_data.json not found in gist')
  return JSON.parse(content)
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
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
}

export async function testConnection(token, gistId) {
  if (!token) throw new Error('GitHub 토큰이 없습니다')
  if (!gistId) {
    // Test token is valid by checking auth
    const res = await fetch(`${API}/gists`, { headers: headers(token) })
    if (!res.ok) throw new Error('토큰이 유효하지 않습니다')
    return
  }
  await loadGist(token, gistId)
}
