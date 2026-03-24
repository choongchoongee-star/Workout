import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import { calcCalories } from '../lib/calories'
import { extractCardioFromPhoto } from '../lib/gemini'
import StepperInput from '../components/StepperInput'
import RestTimer from '../components/RestTimer'
import { CATEGORIES } from '../data/exercises'
import { getProgressionSuggestion } from '../lib/epley'

function localTodayStr() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

function newWeightSet(weight = 20, reps = 10) {
  return { weight, reps, done: false }
}

function newCardioRecord() {
  return { duration_min: null, distance_km: null, speed_kmh: null, incline_pct: null, calories: null }
}

function deepClone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj))
}

// Search/Add exercise modal
function ExerciseModal({ exercises, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')

  const categories = ['전체', ...CATEGORIES]
  const filtered = exercises.filter(e => {
    const matchCat = activeCategory === '전체' || e.category === activeCategory
    const matchQ = !query || e.name.includes(query)
    return matchCat && matchQ
  })

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-t-2xl mt-auto max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
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
        <div className="flex gap-2 p-3 overflow-x-auto border-b border-zinc-800">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors ${
                activeCategory === c ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
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
      <span className="text-zinc-600 text-sm w-8 text-right flex-shrink-0">{setIdx + 1}</span>

      <span className="text-zinc-600 text-xs w-16 text-center">
        {refSet && !set.done
          ? (isBodyweight ? `${refSet.reps}회` : `${refSet.weight}×${refSet.reps}`)
          : ''}
      </span>

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

// Cardio record form — setIdx tracks which set is being edited by photo
function CardioForm({ record, exercise, onUpdate, onPhoto }) {
  const bodyWeight = storage.getBodyWeight()
  const geminiKey = storage.getGeminiKey()

  // Auto-calculate calories from MET when duration changes
  useEffect(() => {
    if (record.duration_min && exercise?.met) {
      const cal = calcCalories(exercise.met, bodyWeight, record.duration_min)
      if (cal != null && cal !== record.calories) {
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
              min="0"
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
          칼로리 (kcal){record.calories && record.duration_min ? ' — 자동계산됨' : ''}
        </label>
        <input
          type="number"
          min="0"
          placeholder="칼로리"
          value={record.calories ?? ''}
          onChange={e => onUpdate('calories', e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

export default function Session() {
  const navigate = useNavigate()
  const { exercises, sessions, upsertSession, getLastSession } = useApp()
  const realToday = localTodayStr()

  const [sessionDate, setSessionDate] = useState(realToday)
  const [sessionExercises, setSessionExercises] = useState(() => {
    const existing = sessions.find(s => s.id === realToday)
    return existing?.exercises ? deepClone(existing.exercises) : []
  })
  const isDateChanging = useRef(false)

  // 날짜가 바뀌면 해당 날짜 세션 로드
  useEffect(() => {
    isDateChanging.current = true
    const existing = sessions.find(s => s.id === sessionDate)
    setSessionExercises(existing?.exercises ? deepClone(existing.exercises) : [])
    // 한 틱 후 플래그 해제 (auto-save useEffect가 건너뛰도록)
    setTimeout(() => { isDateChanging.current = false }, 0)
  }, [sessionDate])

  // 오늘 날짜 세션의 시작 시간 추적
  const startTimeKey = `wl_session_start_${realToday}`
  if (sessionDate === realToday && !sessionStorage.getItem(startTimeKey)) {
    sessionStorage.setItem(startTimeKey, String(Date.now()))
  }

  const [showModal, setShowModal] = useState(false)
  const [restTimer, setRestTimer] = useState({ active: false, remaining: 90, total: 90 })
  const [photoError, setPhotoError] = useState(null)
  const [photoLoading, setPhotoLoading] = useState(null) // exerciseIdx
  const photoInputRef = useRef(null)
  const activePhotoIdx = useRef(null)

  // Auto-save in-progress session to context on every change
  useEffect(() => {
    if (isDateChanging.current) return
    if (sessionExercises.length === 0) return
    const session = {
      id: sessionDate,
      date: sessionDate,
      exercises: sessionExercises.map(({ _lastSets, ...rest }) => rest),
      duration_min: null,
    }
    upsertSession(session)
  }, [sessionExercises])

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer.active || restTimer.remaining <= 0) {
      if (restTimer.active) setRestTimer(t => ({ ...t, active: false }))
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
    const lastSession = getLastSession(ex.id, sessionDate)
    const lastExData = lastSession?.exercises?.find(e => e.exerciseId === ex.id) ?? null

    let sets
    if (ex.type === 'cardio') {
      sets = [newCardioRecord()]
    } else if (lastExData?.sets?.length > 0) {
      sets = lastExData.sets.map(s => ({ ...s, done: false }))
    } else {
      sets = [newWeightSet()]
    }

    setSessionExercises(prev => [...prev, {
      exerciseId: ex.id,
      sets,
      _lastSets: lastExData?.sets ?? null,
    }])
    setShowModal(false)
  }

  function addSet(exIdx) {
    setSessionExercises(prev => {
      const copy = deepClone(prev)
      const ex = copy[exIdx]
      if (!ex) return prev
      const exercise = exercises.find(e => e.id === ex.exerciseId)
      if (exercise?.type === 'cardio') {
        ex.sets = [...ex.sets, newCardioRecord()]
      } else {
        const lastSet = ex.sets[ex.sets.length - 1]
        ex.sets = [...ex.sets, newWeightSet(lastSet?.weight ?? 20, lastSet?.reps ?? 10)]
      }
      return copy
    })
  }

  function updateSet(exIdx, setIdx, field, value) {
    setSessionExercises(prev => {
      const copy = deepClone(prev)
      if (copy[exIdx]?.sets[setIdx]) {
        copy[exIdx].sets[setIdx][field] = value
      }
      return copy
    })
  }

  function completeSet(exIdx, setIdx) {
    setSessionExercises(prev => {
      const copy = deepClone(prev)
      if (copy[exIdx]?.sets[setIdx]) {
        copy[exIdx].sets[setIdx].done = !copy[exIdx].sets[setIdx].done
      }
      return copy
    })
    startRestTimer()
  }

  function removeSet(exIdx, setIdx) {
    setSessionExercises(prev => {
      const copy = deepClone(prev)
      if (!copy[exIdx]) return prev
      copy[exIdx].sets.splice(setIdx, 1)
      if (copy[exIdx].sets.length === 0) copy.splice(exIdx, 1)
      return copy
    })
  }

  function removeExercise(exIdx) {
    setSessionExercises(prev => prev.filter((_, i) => i !== exIdx))
  }

  function finishSession() {
    let durationMin = null
    if (sessionDate === realToday) {
      const startTime = parseInt(sessionStorage.getItem(startTimeKey), 10) || Date.now()
      durationMin = Math.max(1, Math.round((Date.now() - startTime) / 60000))
      sessionStorage.removeItem(startTimeKey)
    }

    const session = {
      id: sessionDate,
      date: sessionDate,
      exercises: sessionExercises.map(({ _lastSets, ...rest }) => rest),
      duration_min: durationMin,
    }
    upsertSession(session)
    navigate('/history')
  }

  // Photo handler
  function handlePhotoClick(exIdx) {
    setPhotoError(null)
    activePhotoIdx.current = exIdx
    photoInputRef.current?.click()
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const exIdx = activePhotoIdx.current
    if (exIdx == null) return

    setPhotoLoading(exIdx)
    setPhotoError(null)

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

      const apiKey = storage.getGeminiKey()
      const result = await extractCardioFromPhoto(apiKey, base64, file.type)

      setSessionExercises(prev => {
        const copy = deepClone(prev)
        // Ensure set[0] exists for cardio
        if (!copy[exIdx]) return prev
        if (!copy[exIdx].sets[0]) copy[exIdx].sets[0] = newCardioRecord()
        const record = copy[exIdx].sets[0]
        if (result.duration_min != null) record.duration_min = result.duration_min
        if (result.distance_km != null) record.distance_km = result.distance_km
        if (result.speed_kmh != null) record.speed_kmh = result.speed_kmh
        if (result.incline_pct != null) record.incline_pct = result.incline_pct
        if (result.calories != null) record.calories = result.calories
        return copy
      })
    } catch (err) {
      setPhotoError('사진 인식에 실패했습니다. 다시 시도하거나 직접 입력해주세요.')
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
          <p className="text-zinc-400 text-sm">{sessionDate === realToday ? '오늘' : '다른 날 기록'}</p>
          <input
            type="date"
            value={sessionDate}
            max={realToday}
            onChange={e => e.target.value && setSessionDate(e.target.value)}
            className="text-xl font-bold text-white bg-transparent focus:outline-none"
          />
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

      {/* Photo error banner */}
      {photoError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-3 text-sm text-red-300 flex justify-between">
          <span>사진 인식 실패: {photoError}</span>
          <button onClick={() => setPhotoError(null)} className="text-red-400 ml-2">✕</button>
        </div>
      )}

      {/* Exercise cards */}
      <div className="space-y-3">
        {sessionExercises.map((se, exIdx) => {
          const exercise = exercises.find(e => e.id === se.exerciseId)
          const isCardio = exercise?.type === 'cardio'
          const progression = !isCardio ? getProgressionSuggestion(sessions, se.exerciseId, sessionDate) : null

          return (
            <div key={exIdx} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
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
              {/* Progression suggestion */}
              {progression && (
                <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg px-3 py-1.5 mb-2 text-xs text-blue-300">
                  {progression.message}
                </div>
              )}

              {isCardio ? (
                photoLoading === exIdx ? (
                  <p className="text-zinc-400 text-sm text-center py-4 animate-pulse">사진 분석 중...</p>
                ) : (
                  <CardioForm
                    record={se.sets[0] ?? newCardioRecord()}
                    exercise={exercise}
                    onUpdate={(field, value) => updateSet(exIdx, 0, field, value)}
                    onPhoto={() => handlePhotoClick(exIdx)}
                  />
                )
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1 mt-2">
                    <span className="w-8" />
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
                      refSet={se._lastSets?.[setIdx] ?? null}
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

      <button
        onClick={() => setShowModal(true)}
        className="w-full mt-3 bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-4 text-sm active:bg-zinc-800 transition-colors"
      >
        + 운동 추가
      </button>

      {sessionExercises.length === 0 && (
        <p className="text-zinc-600 text-sm text-center mt-6">위 버튼을 눌러 운동을 추가하세요</p>
      )}

      {restTimer.active && (
        <RestTimer
          seconds={restTimer.remaining}
          total={restTimer.total}
          onDone={() => setRestTimer(t => ({ ...t, active: false }))}
          onSkip={() => setRestTimer(t => ({ ...t, active: false }))}
        />
      )}

      {showModal && (
        <ExerciseModal
          exercises={exercises}
          onSelect={addExercise}
          onClose={() => setShowModal(false)}
        />
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
