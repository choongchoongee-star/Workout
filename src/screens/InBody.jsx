import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import { extractInBodyFromPhoto } from '../lib/gemini'

function localTodayStr() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const MAIN_FIELDS = [
  { key: 'weight', label: '체중 (kg)', placeholder: '70.0', step: '0.1' },
  { key: 'skeletal_muscle_mass', label: '골격근량 (kg)', placeholder: '32.0', step: '0.1' },
  { key: 'body_fat_mass', label: '체지방량 (kg)', placeholder: '15.0', step: '0.1' },
  { key: 'body_fat_pct', label: '체지방률 (%)', placeholder: '21.0', step: '0.1' },
  { key: 'height', label: '키 (cm)', placeholder: '175', step: '0.1' },
]

const SEGMENTAL_FIELDS = [
  { key: 'left_arm', label: '왼팔 (kg)' },
  { key: 'right_arm', label: '오른팔 (kg)' },
  { key: 'trunk', label: '몸통 (kg)' },
  { key: 'left_leg', label: '왼다리 (kg)' },
  { key: 'right_leg', label: '오른다리 (kg)' },
]

function emptyForm(heightDefault) {
  return {
    weight: '',
    skeletal_muscle_mass: '',
    body_fat_mass: '',
    body_fat_pct: '',
    height: heightDefault ? String(heightDefault) : '',
    left_arm: '',
    right_arm: '',
    trunk: '',
    left_leg: '',
    right_leg: '',
  }
}

export default function InBody() {
  const navigate = useNavigate()
  const { inbody, addInBody, deleteInBody } = useApp()
  const geminiKey = storage.getGeminiKey()
  const heightDefault = storage.getHeight()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(() => emptyForm(heightDefault))
  const [photoLoading, setPhotoLoading] = useState(false)
  const [error, setError] = useState(null)
  const photoInputRef = useRef(null)

  function handleFieldChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const weight = parseFloat(form.weight)
    const skeletal_muscle_mass = parseFloat(form.skeletal_muscle_mass)
    if (!weight || !skeletal_muscle_mass) {
      setError('체중과 골격근량은 필수입니다.')
      return
    }

    const record = {
      id: `ib_${Date.now()}`,
      date: localTodayStr(),
      weight,
      skeletal_muscle_mass,
      body_fat_mass: parseFloat(form.body_fat_mass) || null,
      body_fat_pct: parseFloat(form.body_fat_pct) || null,
      height: parseFloat(form.height) || null,
      left_arm: parseFloat(form.left_arm) || null,
      right_arm: parseFloat(form.right_arm) || null,
      trunk: parseFloat(form.trunk) || null,
      left_leg: parseFloat(form.left_leg) || null,
      right_leg: parseFloat(form.right_leg) || null,
    }

    addInBody(record)
    setShowForm(false)
    setForm(emptyForm(heightDefault))
    setError(null)
    navigate(`/inbody/${record.id}`)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoLoading(true)
    setError(null)

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          const commaIdx = result.indexOf(',')
          if (commaIdx === -1) { reject(new Error('파일을 읽을 수 없습니다')); return }
          resolve(result.slice(commaIdx + 1))
        }
        reader.onerror = () => reject(new Error('파일 읽기 실패'))
        reader.readAsDataURL(file)
      })

      const result = await extractInBodyFromPhoto(geminiKey, base64, file.type)
      setForm(prev => ({
        ...prev,
        weight: result.weight != null ? String(result.weight) : prev.weight,
        skeletal_muscle_mass: result.skeletal_muscle_mass != null ? String(result.skeletal_muscle_mass) : prev.skeletal_muscle_mass,
        body_fat_mass: result.body_fat_mass != null ? String(result.body_fat_mass) : prev.body_fat_mass,
        body_fat_pct: result.body_fat_pct != null ? String(result.body_fat_pct) : prev.body_fat_pct,
        height: result.height != null ? String(result.height) : prev.height,
        left_arm: result.left_arm != null ? String(result.left_arm) : prev.left_arm,
        right_arm: result.right_arm != null ? String(result.right_arm) : prev.right_arm,
        trunk: result.trunk != null ? String(result.trunk) : prev.trunk,
        left_leg: result.left_leg != null ? String(result.left_leg) : prev.left_leg,
        right_leg: result.right_leg != null ? String(result.right_leg) : prev.right_leg,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setPhotoLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold text-white">InBody</h1>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError(null) }}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl active:bg-blue-700"
          >
            + 입력
          </button>
        )}
      </div>

      {/* Input form */}
      {showForm && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
          <h2 className="text-white font-semibold mb-3">체성분 입력</h2>

          {geminiKey && (
            <button
              onClick={() => { setError(null); photoInputRef.current?.click() }}
              disabled={photoLoading}
              className="w-full bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm active:bg-zinc-700 flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
            >
              {photoLoading ? '분석 중...' : '📷 InBody 결과지 촬영해서 자동 입력'}
            </button>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-3 text-sm text-red-300 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 ml-2">✕</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {MAIN_FIELDS.map(({ key, label, placeholder, step }) => (
              <div key={key}>
                <label className="text-zinc-500 text-xs block mb-1">{label}</label>
                <input
                  type="number"
                  step={step}
                  min="0"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => handleFieldChange(key, e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <details className="mb-3">
            <summary className="text-zinc-500 text-sm cursor-pointer select-none">부위별 근육량 (선택)</summary>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {SEGMENTAL_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-zinc-500 text-xs block mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={form[key]}
                    onChange={e => handleFieldChange(key, e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </details>

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="flex-1 bg-zinc-800 text-zinc-400 rounded-xl py-2.5 text-sm active:bg-zinc-700"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium active:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* Records list */}
      {inbody.length === 0 && !showForm ? (
        <p className="text-zinc-600 text-sm text-center mt-12">
          InBody 기록이 없습니다.<br />
          <span className="text-zinc-700">+ 입력 버튼으로 추가하세요.</span>
        </p>
      ) : (
        <div className="space-y-3">
          {inbody.map(record => (
            <div key={record.id} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">{record.date}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/inbody/${record.id}`)}
                    className="text-blue-400 text-sm active:text-blue-300"
                  >
                    분석 보기
                  </button>
                  <button
                    onClick={() => deleteInBody(record.id)}
                    className="text-zinc-600 active:text-red-400 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-zinc-500 text-xs">체중</p>
                  <p className="text-white text-sm font-medium">{record.weight}kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">골격근량</p>
                  <p className="text-white text-sm font-medium">{record.skeletal_muscle_mass}kg</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">체지방률</p>
                  <p className="text-white text-sm font-medium">
                    {record.body_fat_pct != null ? `${record.body_fat_pct}%` : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  )
}
