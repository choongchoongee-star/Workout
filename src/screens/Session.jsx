import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import { calcCalories } from '../lib/calories'
import StepperInput from '../components/StepperInput'
import RestTimer from '../components/RestTimer'
import { CATEGORIES } from '../data/exercises'
import { getProgressionSuggestion } from '../lib/epley'
import { localTodayStr } from '../lib/dateUtils'

function newWeightSet(weight = 20, reps = 10) {
  return { weight, reps, done: false }
}

function newCardioRecord() {
  return { duration_min: null, distance_km: null, speed_kmh: null, incline_pct: null, calories: null }
}

function deepClone(obj) {
  return structuredClone(obj)
}

// Search/Add exercise modal
function ExerciseModal({ exercises, onSelect, onClose, addedIds = new Set(), loaded = true }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')
  const modalRef = useRef(null)

  const categories = ['전체', ...CATEGORIES]
  const filtered = exercises.filter(e => {
    const matchCat = activeCategory === '전체' || e.category === activeCategory
    const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  // Escape to close + Tab focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="운동 추가"
        className="bg-zinc-900 rounded-t-2xl mt-auto max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">운동 추가</h3>
          <button onClick={onClose} aria-label="닫기" className="text-zinc-400 active:text-white p-1">✕</button>
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
        <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar border-b border-zinc-800">
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
          {!loaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(ex => {
              const alreadyAdded = addedIds.has(ex.id)
              return (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-zinc-800 border-b border-zinc-800/50 ${
                    alreadyAdded ? 'opacity-50' : ''
                  }`}
                >
                  <span className="text-white">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    {alreadyAdded && <span className="text-zinc-500 text-xs">추가됨</span>}
                    <span className="text-zinc-500 text-xs">{ex.category}</span>
                  </div>
                </button>
              )
            })
          ) : (
            <p className="text-zinc-600 text-sm text-center py-8">검색 결과 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Single set row for weight/bodyweight exercise
function SetRow({ setIdx, set, exerciseType, onUpdate, onDone, onRemove }) {
  const isBodyweight = exerciseType === 'bodyweight'
  const locked = set.done

  return (
    <div className={`py-2 border-b border-zinc-800/40 last:border-b-0 ${locked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-zinc-500 text-sm">{setIdx + 1}세트</span>
        <div className="flex-1" />
        <button
          onClick={onDone}
          aria-label={locked ? '세트 완료 취소' : '세트 완료'}
          aria-pressed={locked}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            locked
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 active:bg-green-600 active:text-white'
          }`}
        >
          ✓
        </button>
        <button onClick={onRemove} aria-label="세트 삭제" className="text-zinc-700 active:text-red-400 px-1 text-lg">
          ×
        </button>
      </div>
      <div className="flex items-center gap-3">
        {isBodyweight ? (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">체중+</span>
            <StepperInput
              value={set.added_weight ?? 0}
              onChange={v => onUpdate('added_weight', v)}
              step={2.5}
              unit="kg"
              disabled={locked}
            />
          </div>
        ) : (
          <StepperInput
            value={set.weight ?? 20}
            onChange={v => onUpdate('weight', v)}
            step={2.5}
            unit="kg"
            disabled={locked}
          />
        )}
        <StepperInput
          value={set.reps ?? 10}
          onChange={v => onUpdate('reps', v)}
          step={1}
          unit="회"
          disabled={locked}
        />
      </div>
    </div>
  )
}

// Cardio record form
function CardioForm({ record, exercise, onUpdate }) {
  const bodyWeight = storage.getBodyWeight()

  // Auto-calculate calories from MET when duration changes
  useEffect(() => {
    if (record.duration_min && exercise?.met) {
      const cal = calcCalories(exercise.met, bodyWeight, record.duration_min)
      if (cal != null && cal !== record.calories) {
        onUpdate('calories', cal)
      }
    }
  // onUpdate/record.calories 포함 시 칼로리 갱신 후 재실행 → 무한루프
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.duration_min, exercise?.met, bodyWeight])

  return (
    <div className="space-y-3 py-2">
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
              onChange={e => onUpdate(key, e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value)))}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div>
        <label className="text-zinc-500 text-xs block mb-1">
          칼로리 (kcal){record.calories && record.duration_min ? ' — 자동계산됨' : (!exercise?.met ? ' — 수동 입력' : '')}
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
  const location = useLocation()
  const { exercises, sessions, upsertSession, getLastSession, syncError, loaded } = useApp()
  const realToday = localTodayStr()

  const initialDate = location.state?.date ?? realToday
  const [sessionDate, setSessionDate] = useState(initialDate)
  const [sessionExercises, setSessionExercises] = useState(() => {
    const existing = sessions.find(s => s.id === initialDate)
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
  // sessions 포함 시 auto-save 때마다 재실행 → 입력 중 데이터 리셋
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDate])

  // 오늘 날짜 세션의 시작 시간 추적
  const startTimeKey = `wl_session_start_${realToday}`
  useEffect(() => {
    if (sessionDate !== realToday) return
    try {
      if (!sessionStorage.getItem(startTimeKey)) {
        sessionStorage.setItem(startTimeKey, String(Date.now()))
      }
    } catch {
      // sessionStorage 접근 불가 (Safari 사생활 보호 모드 등) — 무시하고 계속
    }
  }, [sessionDate, realToday, startTimeKey])

  const [showModal, setShowModal] = useState(false)
  const [restTimer, setRestTimer] = useState({ active: false, remaining: 90, total: 90 })

  // Auto-save in-progress session to context on every change
  useEffect(() => {
    if (isDateChanging.current) return
    if (sessionExercises.length === 0) return
    upsertSession({ id: sessionDate, date: sessionDate, exercises: sessionExercises, duration_min: null })
  }, [sessionExercises, sessionDate, upsertSession])

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
    } else {
      // 이전 세션의 마지막 세트 값을 기본값으로, 한 세트씩 추가
      const lastSet = lastExData?.sets?.[lastExData.sets.length - 1] ?? null
      sets = [newWeightSet(lastSet?.weight ?? 20, lastSet?.reps ?? 10)]
    }

    setSessionExercises(prev => [{ exerciseId: ex.id, sets }, ...prev])
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
    const wasUndone = !sessionExercises[exIdx]?.sets[setIdx]?.done
    setSessionExercises(prev => {
      const copy = deepClone(prev)
      if (copy[exIdx]?.sets[setIdx]) {
        copy[exIdx].sets[setIdx].done = !copy[exIdx].sets[setIdx].done
      }
      return copy
    })
    if (wasUndone) startRestTimer()
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
      try {
        const startTime = parseInt(sessionStorage.getItem(startTimeKey), 10) || Date.now()
        durationMin = Math.max(1, Math.round((Date.now() - startTime) / 60000))
        sessionStorage.removeItem(startTimeKey)
      } catch {
        durationMin = null
      }
    }

    upsertSession({ id: sessionDate, date: sessionDate, exercises: sessionExercises, duration_min: durationMin })
    navigate('/history')
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <p className="text-zinc-400 text-sm">{sessionDate === realToday ? '오늘' : '다른 날 기록'}</p>
          <div className="relative">
            <p className="text-xl font-bold text-white pointer-events-none underline decoration-dotted decoration-zinc-600 underline-offset-4">
              {(() => { const [y, m, d] = sessionDate.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) })()}
            </p>
            <input
              type="date"
              value={sessionDate}
              max={realToday}
              onChange={e => e.target.value && setSessionDate(e.target.value)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
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

      {syncError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-300">
          데이터 저장에 실패했습니다. 네트워크를 확인해주세요.
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full mb-3 bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 rounded-2xl py-4 text-sm active:bg-zinc-800 transition-colors"
      >
        + 운동 추가
      </button>

      {sessionExercises.length === 0 && (
        <p className="text-zinc-600 text-sm text-center mt-2">위 버튼을 눌러 운동을 추가하세요</p>
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
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="text-white font-semibold truncate">{exercise?.name || se.exerciseId}</h3>
                  <span className="text-zinc-500 text-xs">{exercise?.category}</span>
                </div>
                <button
                  onClick={() => removeExercise(exIdx)}
                  aria-label="운동 삭제"
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
                <CardioForm
                  record={se.sets[0] ?? newCardioRecord()}
                  exercise={exercise}
                  onUpdate={(field, value) => updateSet(exIdx, 0, field, value)}
                />
              ) : (
                <>
                  {se.sets.map((set, setIdx) => (
                    <SetRow
                      key={setIdx}
                      setIdx={setIdx}
                      set={set}
                      exerciseType={exercise?.type}
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
          addedIds={new Set(sessionExercises.map(se => se.exerciseId))}
          loaded={loaded}
        />
      )}

    </div>
  )
}
