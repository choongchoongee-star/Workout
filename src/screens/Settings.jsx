import { useState } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

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
  const { user, logout } = useAuth()
  const [bodyWeight, setBodyWeight] = useState(String(storage.getBodyWeight()))
  const [height, setHeight] = useState(String(storage.getHeight()))
  const [restSeconds, setRestSeconds] = useState(String(storage.getRestSeconds()))
  const [status, setStatus] = useState({})

  function save() {
    const bw = parseFloat(bodyWeight)
    if (!isNaN(bw) && bw > 0) storage.setBodyWeight(bw)
    const ht = parseFloat(height)
    if (!isNaN(ht) && ht > 0) storage.setHeight(ht)
    const rs = parseInt(restSeconds)
    if (!isNaN(rs) && rs > 0) storage.setRestSeconds(rs)
    setStatus({ msg: '저장 완료 ✓', ok: true })
    setTimeout(() => setStatus({}), 2000)
  }

  async function handleLogout() {
    await logout()
  }

  const inputCls = "w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h1 className="text-xl font-bold text-white mb-6 pt-2">설정</h1>

      {/* Account */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">계정</h2>
        <div className="flex items-center gap-3 mb-4">
          {user?.photoURL && (
            <img src={user.photoURL} alt="프로필" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <p className="text-white text-sm font-medium">{user?.displayName}</p>
            <p className="text-zinc-500 text-xs">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-zinc-700 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-600"
        >
          로그아웃
        </button>
      </div>

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
        <Field label="키 (cm)" hint="InBody SMI 계산에 사용됩니다">
          <input
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            className={inputCls}
            placeholder="175"
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

      {/* Library link */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">운동 목록 관리</h2>
        <Link
          to="/library"
          className="flex items-center justify-between text-sm text-zinc-300 active:text-white"
        >
          <span>운동 목록 보기 / 커스텀 운동 추가</span>
          <span className="text-zinc-500">→</span>
        </Link>
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
