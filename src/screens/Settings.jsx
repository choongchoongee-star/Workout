import { useState } from 'react'
import { storage } from '../lib/storage'
import { createGist, testConnection } from '../lib/gist'
import { testGeminiKey } from '../lib/gemini'

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="text-zinc-300 text-sm font-medium block mb-1">{label}</label>
      {hint && <p className="text-zinc-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  )
}

export default function Settings() {
  const [githubToken, setGithubToken] = useState(storage.getGithubToken())
  const [gistId, setGistId] = useState(storage.getGistId())
  const [geminiKey, setGeminiKey] = useState(storage.getGeminiKey())
  const [bodyWeight, setBodyWeight] = useState(String(storage.getBodyWeight()))
  const [restSeconds, setRestSeconds] = useState(String(storage.getRestSeconds()))
  const [showTokens, setShowTokens] = useState(false)
  const [status, setStatus] = useState({})

  function save() {
    storage.setGithubToken(githubToken)
    storage.setGistId(gistId)
    storage.setGeminiKey(geminiKey)
    const bw = parseFloat(bodyWeight)
    if (!isNaN(bw) && bw > 0) storage.setBodyWeight(bw)
    const rs = parseInt(restSeconds)
    if (!isNaN(rs) && rs > 0) storage.setRestSeconds(rs)
    setStatus({ msg: '저장 완료 ✓', ok: true })
    setTimeout(() => setStatus({}), 2000)
  }

  async function handleCreateGist() {
    if (!githubToken) { setStatus({ msg: 'GitHub 토큰을 먼저 입력하세요', ok: false }); return }
    setStatus({ msg: 'Gist 생성 중...', ok: null })
    try {
      storage.setGithubToken(githubToken)
      const id = await createGist(githubToken)
      setGistId(id)
      storage.setGistId(id)
      setStatus({ msg: `Gist 생성됨: ${id}`, ok: true })
    } catch (err) {
      setStatus({ msg: `오류: ${err.message}`, ok: false })
    }
  }

  async function handleTestGist() {
    setStatus({ msg: '연결 테스트 중...', ok: null })
    try {
      storage.setGithubToken(githubToken)
      storage.setGistId(gistId)
      await testConnection(githubToken, gistId)
      setStatus({ msg: 'GitHub 연결 성공 ✓', ok: true })
    } catch (err) {
      setStatus({ msg: `오류: ${err.message}`, ok: false })
    }
  }

  async function handleTestGemini() {
    setStatus({ msg: 'Gemini API 테스트 중...', ok: null })
    try {
      await testGeminiKey(geminiKey)
      setStatus({ msg: 'Gemini API 연결 성공 ✓', ok: true })
    } catch (err) {
      setStatus({ msg: `오류: ${err.message}`, ok: false })
    }
  }

  const inputCls = "w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h1 className="text-xl font-bold text-white mb-6 pt-2">설정</h1>

      {/* Body settings */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-4">기본 설정</h2>
        <Field label="체중 (kg)" hint="유산소 칼로리 자동계산에 사용됩니다">
          <input
            type="number"
            value={bodyWeight}
            onChange={e => setBodyWeight(e.target.value)}
            className={inputCls}
            placeholder="70"
          />
        </Field>
        <Field label="휴식 타이머 (초)">
          <input
            type="number"
            value={restSeconds}
            onChange={e => setRestSeconds(e.target.value)}
            className={inputCls}
            placeholder="90"
          />
        </Field>
      </div>

      {/* GitHub Gist */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-zinc-300 font-medium">GitHub Gist 연동</h2>
          <button
            onClick={() => setShowTokens(s => !s)}
            className="text-zinc-500 text-xs active:text-zinc-300"
          >
            {showTokens ? '숨기기' : '보기'}
          </button>
        </div>
        <Field
          label="GitHub Personal Access Token"
          hint="Settings → Developer settings → Personal access tokens → gist 권한만 체크"
        >
          <input
            type={showTokens ? 'text' : 'password'}
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            className={inputCls}
            placeholder="ghp_..."
            autoComplete="off"
          />
        </Field>
        <Field label="Gist ID" hint="아래 '새 Gist 생성' 버튼을 누르거나 기존 Gist ID를 입력하세요">
          <input
            type="text"
            value={gistId}
            onChange={e => setGistId(e.target.value)}
            className={inputCls}
            placeholder="Gist ID (자동 입력됨)"
            autoComplete="off"
          />
        </Field>
        <div className="flex gap-2">
          <button
            onClick={handleCreateGist}
            className="flex-1 bg-zinc-700 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-600"
          >
            새 Gist 생성
          </button>
          <button
            onClick={handleTestGist}
            className="flex-1 bg-zinc-700 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-600"
          >
            연결 테스트
          </button>
        </div>
      </div>

      {/* Gemini API */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-4">Gemini API (사진 인식)</h2>
        <Field
          label="Gemini API Key"
          hint="Google AI Studio에서 발급. 사용량 한도와 HTTP referrer 제한 설정 권장"
        >
          <input
            type={showTokens ? 'text' : 'password'}
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            className={inputCls}
            placeholder="AIza..."
            autoComplete="off"
          />
        </Field>
        <button
          onClick={handleTestGemini}
          className="w-full bg-zinc-700 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-600"
        >
          연결 테스트
        </button>
      </div>

      {/* Status message */}
      {status.msg && (
        <div className={`rounded-xl p-3 mb-4 text-sm text-center ${
          status.ok === true ? 'bg-green-900/30 text-green-300 border border-green-800' :
          status.ok === false ? 'bg-red-900/30 text-red-300 border border-red-800' :
          'bg-zinc-800 text-zinc-400'
        }`}>
          {status.msg}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={save}
        className="w-full bg-blue-600 text-white font-semibold rounded-2xl py-4 active:bg-blue-700"
      >
        저장
      </button>
    </div>
  )
}
