import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import { calcCalories } from '../lib/calories'
import { extractCardioFromPhoto } from '../lib/gemini'
import StepperInput from '../components/StepperInput'
import RestTimer from '../components/RestTimer'
import { CATEGORIES } from '../data/exercises'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function newWeightSet(weight = 20, reps = 10) {
  return { weight, reps, done: false }
}

function newCardioRecord() {
  return { duration_min: 0, distance_km: null, speed_kmh: null, incline_pct: null, calories: null }
}

// Search/Add exercise modal
function ExerciseModal({ exercises, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')

  const categories = ['전체', ...CATEGORIES]
  const filtered = exercises.filter(e => {
    const matchCat = activeCategory === '전체' || e.category === activeCategory
    const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="bg-zinc-900 rounded-t-2xl mt-auto max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">운동 추가</h3>
          <button onClick={onClose} className="text-zinc-400 active:text-white p-1">✕</button>
        </div>
        <div className="p-3 border-b border-zinc-800">
          <input
            autoFocus
            type="text"
            placeholder="운동 검색..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
          />
        </div>
        <div className="flex gap-2 p-3 overflow-x-auto border-b border-zinc-800 no-scrollbar">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors ${
                activeCategory === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-zinc-800 border-b border-zinc-800/50"
            >
              <span className="text-white">{ex.name}</span>
              <span className="text-zinc-500 text-xs">{ex.category}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Single set row for weight/bodyweight exercise
function SetRow({ setIdx, set, exerciseType, onUpdate, onDone, onRemove, refSet }) {
  const isBodyweight = exerciseType === 'bodyweight'

  return (
    <div className={`flex items-center gap-2 py-2 ${set.done ? 'opacity-40' : ''}`}>
      <span className="text-zinc-600 text-sm w-5 text-right">{setIdx + 1}</span>

      {refSet && !set.done && (
        <span className="text-zinc-600 text-xs w-16 text-center">
          {isBodyweight ? `${refSet.reps}회` : `${refSet.weight}×${refSet.reps}`}
        </span>
      )}
      {(!refSet || set.done) && <span className="w-16" />}

      <div className="flex-1 flex items-center gap-2 justify-center flex-wrap">
        {isBodyweight ? (
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-xs">+</span>
            <StepperInput
              value={set.added_weight ?? 0}
              onChange={v => onUpdate('added_weight', v)}
              step={2.5}
              unit="kg"
            />
          </div>
        ) : (
          <StepperInput
            value={set.weight ?? 20}
            onChange={v => onUpdate('weight', v)}
            step={2.5}
            unit="kg"
          />
        )}
        <StepperInput
          value={set.reps ?? 10}
          onChange={v => onUpdate('reps', v)}
          step={1}
          unit="회"
        />
      </div>

      <button
        onClick={onDone}
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          set.done
            ? 'bg-green-600 text-white'
            : 'bg-zinc-800 text-zinc-400 active:bg-green-600 active:text-white'
        }`}
      >
        ✓
      </button>
      <button
        onClick={onRemove}
        className="text-zinc-700 active:text-red-400 px-1 text-lg"
      >
        ×
      </button>
    </div>
  )
}

// Cardio record form
function CardioForm({ record, exercise, onUpdate, onPhoto }) {
  const bodyWeight = storage.getBodyWeight()
  const geminiKey = storage.getGeminiKey()

  // Auto-calculate calories when duration changes
  useEffect(() => {
    if (record.duration_min && exercise?.met) {
      const cal = calcCalories(exercise.met, bodyWeight, record.duration_min)
      if (cal !== record.calories) {
        onUpdate('calories', cal)
      }
    }
  }, [record.duration_min, exercise?.met, bodyWeight])

  return (
    <div className="space-y-3 py-2">
      {geminiKey && (
        <button
          onClick={onPhoto}
          className="w-full bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm active:bg-zinc-700 flex items-center justify-center gap-2"
        >
          📷 기기 화면 촬영해서 자동 입력
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'duration_min', label: '시간 (분)', placeholder: '35' },
          { key: 'distance_km', label: '거리 (km)', placeholder: '5.2' },
          { key: 'speed_kmh', label: '속도 (km/h)', placeholder: '8.5' },
          { key: 'incline_pct', label: '경사 (%)', placeholder: '2.0' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-zinc-500 text-xs block mb-1">{label}</label>
            <input
              type="number"
              step="0.1"
              placeholder={placeholder}
              value={record[key] ?? ''}
              onChange={e => onUpdate(key, e.target.value === '' ? null : parseFloat(e.target.value))}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div>
        <label className="text-zinc-500 text-xs block mb-1">
          칼로리 (kcal) {record.calories && record.duration_min ? '— 자동계산됨' : ''}
        </label>
        <input
          type="number"
          placeholder="칼로리"
          value={record.calories ?? ''}
          onChange={e => onUpdate('calories', e.target.value === '' ? null : parseInt(e.target.value))}
          className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

export default function Session() {
  const navigate = useNavigate()
  const { exercises, sessions, upsertSession, getLastSession } = useApp()
  const today = todayStr()
  const startTime = useRef(Date.now())

  // Initialize session from existing today session or empty
  const existingSession = sessions.find(s => s.id === today)
  const [sessionExercises, setSessionExercises] = useState(
    existingSession?.exercises ? JSON.parse(JSON.stringify(existingSession.exercises)) : []
  )

  const [showModal, setShowModal] = useState(false)
  const [restTimer, setRestTimer] = useState({ active: false, remaining: 90, total: 90 })
  const [photoLoading, setPhotoLoading] = useState(null) // exerciseIdx
  const photoInputRef = useRef(null)
  const activePhotoIdx = useRef(null)

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer.active) return
    if (restTimer.remaining <= 0) {
      setRestTimer(t => ({ ...t, active: false }))
      return
    }
    const id = setTimeout(() => {
      setRestTimer(t => ({ ...t, remaining: t.remaining - 1 }))
    }, 1000)
    return () => clearTimeout(id)
  }, [restTimer.active, restTimer.remaining])

  function startRestTimer() {
    const secs = storage.getRestSeconds()
    setRestTimer({ active: true, remaining: secs, total: secs })
  }

  function addExercise(ex) {
    const lastSession = getLastSession(ex.id, today)
    const lastExData = lastSession?.exercises.find(e => e.exerciseId === ex.id)

    let sets
    if (ex.type === 'cardio') {
      sets = [newCardioRecord()]
    } else if (lastExData?.sets?.length) {
      // Pre-fill from last session
      sets = lastExData.sets.map(s => ({ ...s, done: false }))
    } else {
      sets = [newWeightSet()]
    }

    setSessionExercises(prev => [...prev, {
      exerciseId: ex.id,
      sets,
      _lastSets: lastExData?.sets || null,
    }])
    setShowModal(false)
  }

  function addSet(exIdx) {
    setSessionExercises(prev => {
      const copy = [...prev]
      const ex = { ...copy[exIdx] }
      const exercise = exercises.find(e => e.id === ex.exerciseId)
      if (exercise?.type === 'cardio') {
        ex.sets = [...ex.sets, newCardioRecord()]
      } else {
        const lastSet = ex.sets[ex.sets.length - 1]
        ex.sets = [...ex.sets, newWeightSet(lastSet?.weight ?? 20, lastSet?.reps ?? 10)]
      }
      copy[exIdx] = ex
      return copy
    })
  }

  function updateSet(exIdx, setIdx, field, value) {
    setSessionExercises(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      copy[exIdx].sets[setIdx][field] = value
      return copy
    })
  }

  function completeSet(exIdx, setIdx) {
    setSessionExercises(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      copy[exIdx].sets[setIdx].done = !copy[exIdx].sets[setIdx].done
      return copy
    })
    startRestTimer()
  }

  function removeSet(exIdx, setIdx) {
    setSessionExercises(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      copy[exIdx].sets.splice(setIdx, 1)
      if (copy[exIdx].sets.length === 0) copy.splice(exIdx, 1)
      return copy
    })
  }

  function removeExercise(exIdx) {
    setSessionExercises(prev => prev.filter((_, i) => i !== exIdx))
  }

  function finishSession() {
    const durationMin = Math.round((Date.now() - startTime.current) / 60000)
    const session = {
      id: today,
      date: today,
      exercises: sessionExercises.map(({ _lastSets, ...rest }) => rest),
      duration_min: durationMin,
    }
    upsertSession(session)
    navigate('/history')
  }

  // Photo handler
  function handlePhotoClick(exIdx) {
    activePhotoIdx.current = exIdx
    photoInputRef.current?.click()
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const exIdx = activePhotoIdx.current
    setPhotoLoading(exIdx)

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const apiKey = storage.getGeminiKey()
      const result = await extractCardioFromPhoto(apiKey, base64, file.type)

      setSessionExercises(prev => {
        const copy = JSON.parse(JSON.stringify(prev))
        const record = copy[exIdx].sets[0]
        if (result.duration_min != null) record.duration_min = result.duration_min
        if (result.distance_km != null) record.distance_km = result.distance_km
        if (result.speed_kmh != null) record.speed_kmh = result.speed_kmh
        if (result.incline_pct != null) record.incline_pct = result.incline_pct
        if (result.calories != null) record.calories = result.calories
        return copy
      })
    } catch (err) {
      alert(`사진 인식 실패: ${err.message}`)
    } finally {
      setPhotoLoading(null)
      e.target.value = ''
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <p className="text-zinc-400 text-sm">오늘</p>
          <h1 className="text-xl font-bold text-white">{today}</h1>
        </div>
        {sessionExercises.length > 0 && (
          <button
            onClick={finishSession}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl active:bg-blue-700"
          >
            완료 ✓
          </button>
        )}
      </div>

      {/* Exercise cards */}
      <div className="space-y-3">
        {sessionExercises.map((se, exIdx) => {
          const exercise = exercises.find(e => e.id === se.exerciseId)
          const isCardio = exercise?.type === 'cardio'

          return (
            <div key={exIdx} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{exercise?.name || se.exerciseId}</h3>
                  <span className="text-zinc-500 text-xs">{exercise?.category}</span>
                </div>
                <button
                  onClick={() => removeExercise(exIdx)}
                  className="text-zinc-700 active:text-red-400 text-xl px-2"
                >
                  ×
                </button>
              </div>

              {isCardio ? (
                <>
                  {photoLoading === exIdx ? (
                    <p className="text-zinc-400 text-sm text-center py-4 animate-pulse">사진 분석 중...</p>
                  ) : (
                    <CardioForm
                      record={se.sets[0] || newCardioRecord()}
                      exercise={exercise}
                      onUpdate={(field, value) => updateSet(exIdx, 0, field, value)}
                      onPhoto={() => handlePhotoClick(exIdx)}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5" />
                    <span className="text-zinc-600 text-xs w-16 text-center">이전</span>
                    <span className="flex-1 text-center text-zinc-600 text-xs">무게 / 횟수</span>
                    <span className="w-10" />
                    <span className="w-6" />
                  </div>

                  {se.sets.map((set, setIdx) => (
                    <SetRow
                      key={setIdx}
                      setIdx={setIdx}
                      set={set}
                      exerciseType={exercise?.type}
                      refSet={se._lastSets?.[setIdx]}
                      onUpdate={(field, value) => updateSet(exIdx, setIdx, field, value)}
                      onDone={() => completeSet(exIdx, setIdx)}
                      onRemove={() => removeSet(exIdx, setIdx)}
                    />
                  ))}
                  <button
                    onClick={() => addSet(exIdx)}
                    className="w-full text-zinc-500 text-sm py-2 mt-1 rounded-lg active:text-zinc-300 active:bg-zinc-800 transition-colors"
                  >
                    + 세트 추가
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add exercise button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full mt-3 bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-4 text-sm active:bg-zinc-800 transition-colors"
      >
        + 운동 추가
      </button>

      {sessionExercises.length === 0 && (
        <p className="text-zinc-600 text-sm text-center mt-6">위 버튼을 눌러 운동을 추가하세요</p>
      )}

      {/* Rest timer */}
      {restTimer.active && (
        <RestTimer
          seconds={restTimer.remaining}
          total={restTimer.total}
          onDone={() => setRestTimer(t => ({ ...t, active: false }))}
          onSkip={() => setRestTimer(t => ({ ...t, active: false }))}
        />
      )}

      {/* Exercise search modal */}
      {showModal && (
        <ExerciseModal
          exercises={exercises}
          onSelect={addExercise}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </div>
  )
}
