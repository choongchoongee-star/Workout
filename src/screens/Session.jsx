import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { storage } from '../lib/storage'
import { calcCalories } from '../lib/calories'
import StepperInput from '../components/StepperInput'
import RestTimer from '../components/RestTimer'
import UndoToast from '../components/UndoToast'
import { CATEGORIES } from '../data/exercises'
import { localTodayStr } from '../lib/dateUtils'
import { getMainCategory } from '../lib/sessionUtils'
import { getRemainingSeconds } from '../lib/restTimer'
import { cancelRestNotification, notifyRestComplete, prepareRestNotification, scheduleRestNotification } from '../lib/restNotification'

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
function ExerciseModal({ exercises, onSelect, onClose, addedIds = new Set(), loaded = true, defaultCategory = 'All' }) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(defaultCategory)
  const modalRef = useRef(null)

  const categories = ['All', ...CATEGORIES]
  const filtered = exercises.filter(e => {
    const matchCat = activeCategory === 'All' || e.category === activeCategory
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
        aria-label="Add exercise"
        className="bg-zinc-900 rounded-t-2xl mt-auto h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">Add exercise</h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 active:text-white p-1">✕</button>
        </div>
        <div className="p-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Search exercises..."
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
                    {alreadyAdded && <span className="text-zinc-500 text-xs">Added</span>}
                    <span className="text-zinc-500 text-xs">{ex.category}</span>
                  </div>
                </button>
              )
            })
          ) : (
            <p className="text-zinc-600 text-sm text-center py-8">No exercises found.</p>
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
        <span className="text-zinc-500 text-sm">Set {setIdx + 1}</span>
        <div className="flex-1" />
        <button
          onClick={onDone}
          aria-label={locked ? 'Mark set as incomplete' : 'Mark set as complete'}
          aria-pressed={locked}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            locked
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400 active:bg-green-600 active:text-white'
          }`}
        >
          ✓
        </button>
        <button onClick={onRemove} aria-label="Delete set" className="text-zinc-700 active:text-red-400 px-1 text-lg">
          ×
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] items-center gap-3">
        {isBodyweight ? (
          <div className="min-w-0">
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
          unit="reps"
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
          { key: 'duration_min', label: 'Duration (min)', placeholder: '35' },
          { key: 'distance_km', label: 'Distance (km)', placeholder: '5.2' },
          { key: 'speed_kmh', label: 'Speed (km/h)', placeholder: '8.5' },
          { key: 'incline_pct', label: 'Incline (%)', placeholder: '2.0' },
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
          Calories (kcal){record.calories && record.duration_min ? ' — estimated automatically' : (!exercise?.met ? ' — manual entry' : '')}
        </label>
        <input
          type="number"
          min="0"
          placeholder="Calories"
          value={record.calories ?? ''}
          onChange={e => onUpdate('calories', e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

export default function Session() {
  const location = useLocation()
  const { exercises, sessions, upsertSession, getLastSession, syncError, loaded } = useApp()
  const realToday = localTodayStr()

  const initialDate = location.state?.date ?? realToday
  const [sessionDate, setSessionDate] = useState(initialDate)
  const [sessionExercises, setSessionExercises] = useState(() => {
    const existing = sessions.find(s => s.id === initialDate)
    if (existing?.exercises?.length) return deepClone(existing.exercises)
    return []
  })
  const isDateChanging = useRef(false)
  const didMount = useRef(false)
  // 세트 추가 시 새 세트가 보이도록 스크롤하기 위한 ref
  const addSetBtnRefs = useRef({})
  const pendingScrollExIdx = useRef(null)
  // 운동 추가 시 새 운동 카드가 보이도록 스크롤하기 위한 ref
  const exerciseCardRefs = useRef({})
  const pendingScrollCardIdx = useRef(null)

  // 날짜가 바뀌면 해당 날짜 세션 로드 (첫 마운트 제외 — 초기 state는 lazy init이 처리)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
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
  const [restTimer, setRestTimer] = useState({ active: false, remaining: 90, total: 90, endsAt: null })
  const notifiedRestEndRef = useRef(null)
  const [undoData, setUndoData] = useState(null)

  // Auto-save in-progress session to context on every change
  // 완료 버튼 제거(2026-06-14) → 자동저장 시 오늘 세션의 소요시간도 함께 계산해 보존
  useEffect(() => {
    if (isDateChanging.current) return
    if (sessionExercises.length === 0) return
    let durationMin = null
    if (sessionDate === realToday) {
      try {
        const startTime = parseInt(sessionStorage.getItem(startTimeKey), 10)
        if (startTime) durationMin = Math.max(1, Math.round((Date.now() - startTime) / 60000))
      } catch {
        durationMin = null
      }
    }
    upsertSession({ id: sessionDate, date: sessionDate, exercises: sessionExercises, duration_min: durationMin })
  }, [sessionExercises, sessionDate, upsertSession, realToday, startTimeKey])

  // 세트 추가 후 새 세트(= 해당 운동의 '세트 추가' 버튼 영역)가 화면에 보이도록 스크롤
  useEffect(() => {
    const idx = pendingScrollExIdx.current
    if (idx == null) return
    pendingScrollExIdx.current = null
    addSetBtnRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [sessionExercises])

  // 운동 추가 후 새 운동 카드가 화면에 보이도록 스크롤
  useEffect(() => {
    const idx = pendingScrollCardIdx.current
    if (idx == null) return
    pendingScrollCardIdx.current = null
    exerciseCardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [sessionExercises])

  // Recalculate from the absolute deadline so background timer throttling cannot lose time.
  useEffect(() => {
    if (!restTimer.active || !restTimer.endsAt) return
    const endsAt = restTimer.endsAt

    function updateRemaining() {
      const remaining = getRemainingSeconds(endsAt)
      if (remaining <= 0) {
        if (notifiedRestEndRef.current !== endsAt) {
          notifiedRestEndRef.current = endsAt
          void notifyRestComplete()
        }
        setRestTimer(t => t.active && t.endsAt === endsAt
          ? { ...t, active: false, remaining: 0 }
          : t)
        return
      }
      setRestTimer(t => t.active && t.endsAt === endsAt && t.remaining !== remaining
        ? { ...t, remaining }
        : t)
    }

    updateRemaining()
    const id = window.setInterval(updateRemaining, 250)
    document.addEventListener('visibilitychange', updateRemaining)
    window.addEventListener('focus', updateRemaining)
    window.addEventListener('pageshow', updateRemaining)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', updateRemaining)
      window.removeEventListener('focus', updateRemaining)
      window.removeEventListener('pageshow', updateRemaining)
    }
  }, [restTimer.active, restTimer.endsAt])

  function startRestTimer() {
    const secs = storage.getRestSeconds()
    if (secs <= 0) return
    prepareRestNotification()
    const endsAt = Date.now() + secs * 1000
    void scheduleRestNotification(endsAt)
    setRestTimer({ active: true, remaining: secs, total: secs, endsAt })
  }

  function skipRestTimer() {
    void cancelRestNotification()
    setRestTimer(t => ({ ...t, active: false }))
  }

  function addExercise(ex) {
    // 카디오는 단일 기록이라 빈 배열로 두면 폼이 없어지므로 그대로 한 개 생성
    const sets = ex.type === 'cardio' ? [newCardioRecord()] : []
    // 새 운동은 목록 맨 아래에 추가되므로 추가 후 그 카드로 스크롤
    pendingScrollCardIdx.current = sessionExercises.length
    setSessionExercises(prev => [...prev, { exerciseId: ex.id, sets }])
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
        let lastSet = ex.sets[ex.sets.length - 1]
        // 첫 세트일 경우 과거 세션의 마지막 세트 값을 기본값으로 사용
        if (!lastSet) {
          const lastSession = getLastSession(ex.exerciseId, sessionDate)
          const lastExData = lastSession?.exercises?.find(e => e.exerciseId === ex.exerciseId) ?? null
          lastSet = lastExData?.sets?.[lastExData.sets.length - 1] ?? null
        }
        if (exercise?.type === 'bodyweight') {
          ex.sets = [...ex.sets, { added_weight: lastSet?.added_weight ?? 0, reps: lastSet?.reps ?? 10, done: false }]
        } else {
          ex.sets = [...ex.sets, newWeightSet(lastSet?.weight ?? 20, lastSet?.reps ?? 10)]
        }
      }
      return copy
    })
    pendingScrollExIdx.current = exIdx
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
    const exerciseData = sessionExercises[exIdx]
    if (!exerciseData) return
    const removedSet = exerciseData.sets[setIdx]
    const exerciseName = exercises.find(e => e.id === exerciseData.exerciseId)?.name || exerciseData.exerciseId

    setSessionExercises(prev => {
      const copy = deepClone(prev)
      if (!copy[exIdx]) return prev
      copy[exIdx].sets.splice(setIdx, 1)
      return copy
    })

    setUndoData({ type: 'set', setData: deepClone(removedSet), exIdx, setIdx, name: `${exerciseName} — set ${setIdx + 1}` })
  }

  function removeExercise(exIdx) {
    const removed = sessionExercises[exIdx]
    const exerciseName = exercises.find(e => e.id === removed?.exerciseId)?.name || removed?.exerciseId
    setSessionExercises(prev => prev.filter((_, i) => i !== exIdx))
    setUndoData({ type: 'exercise', data: removed, index: exIdx, name: exerciseName })
  }

  const handleUndo = useCallback(() => {
    if (!undoData) return
    if (undoData.type === 'set') {
      setSessionExercises(prev => {
        const copy = deepClone(prev)
        if (!copy[undoData.exIdx]) return prev
        copy[undoData.exIdx].sets.splice(
          Math.min(undoData.setIdx, copy[undoData.exIdx].sets.length),
          0,
          undoData.setData
        )
        return copy
      })
    } else {
      setSessionExercises(prev => {
        const copy = [...prev]
        copy.splice(Math.min(undoData.index, copy.length), 0, undoData.data)
        return copy
      })
    }
  }, [undoData])

  const handleUndoDismiss = useCallback(() => {
    setUndoData(null)
  }, [])

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <p className="text-zinc-400 text-sm">{sessionDate === realToday ? 'Today' : 'Past workout'}</p>
          <div className="relative">
            <p className="text-xl font-bold text-white pointer-events-none underline decoration-dotted decoration-zinc-600 underline-offset-4">
              {(() => { const [y, m, d] = sessionDate.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })()}
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
      </div>

      {syncError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-300">
          Could not save your workout on this device.
        </div>
      )}

      {sessionExercises.length === 0 && (
        <p className="text-zinc-600 text-sm text-center mt-2 mb-3">Tap below to add an exercise.</p>
      )}

      {/* Exercise cards */}
      <div className="space-y-3">
        {sessionExercises.map((se, exIdx) => {
          const exercise = exercises.find(e => e.id === se.exerciseId)
          const isCardio = exercise?.type === 'cardio'

          return (
            <div
              key={exIdx}
              ref={el => { exerciseCardRefs.current[exIdx] = el }}
              className="bg-zinc-900 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="text-white font-semibold truncate">{exercise?.name || se.exerciseId}</h3>
                  <span className="text-zinc-500 text-xs">{exercise?.category}</span>
                </div>
                <button
                  onClick={() => removeExercise(exIdx)}
                  aria-label="Delete exercise"
                  className="text-zinc-700 active:text-red-400 text-xl px-2"
                >
                  ×
                </button>
              </div>
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
                    ref={el => { addSetBtnRefs.current[exIdx] = el }}
                    onClick={() => addSet(exIdx)}
                    className="w-full text-zinc-500 text-sm py-2 mt-1 rounded-lg active:text-zinc-300 active:bg-zinc-800 transition-colors"
                  >
                    + Add set
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
        + Add exercise
      </button>

      {restTimer.active && (
        <RestTimer
          seconds={restTimer.remaining}
          total={restTimer.total}
          onSkip={skipRestTimer}
        />
      )}

      {undoData && (
        <UndoToast
          message={`${undoData.name} deleted`}
          onUndo={handleUndo}
          onDismiss={handleUndoDismiss}
        />
      )}

      {showModal && (
        <ExerciseModal
          exercises={exercises}
          onSelect={addExercise}
          onClose={() => setShowModal(false)}
          addedIds={new Set(sessionExercises.map(se => se.exerciseId))}
          loaded={loaded}
          defaultCategory={(() => {
            const current = getMainCategory(sessionExercises, exercises)
            if (current) return current
            for (const s of sessions) {
              if (s.date === sessionDate) continue
              const cat = getMainCategory(s.exercises, exercises)
              if (cat) return cat
            }
            return 'All'
          })()}
        />
      )}

    </div>
  )
}
