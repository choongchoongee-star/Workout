import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { DEFAULT_EXERCISES } from '../data/exercises'
import { loadLocalWorkoutData, saveLocalWorkoutData } from '../lib/localWorkoutData'
import { planWorkoutImport } from '../lib/importUtils'
import { mergeDefaultExercises } from '../lib/exerciseLibrary'

const AppContext = createContext(null)

const initialState = {
  exercises: DEFAULT_EXERCISES,
  sessions: [],
  syncing: false,
  syncError: null,
  loaded: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loaded: false, syncing: true, syncError: null }

    case 'LOAD_DATA':
      return {
        ...state,
        exercises: action.exercises,
        sessions: action.sessions,
        loaded: true,
        syncing: false,
        syncError: null,
      }

    case 'LOAD_ERROR':
      return { ...state, loaded: false, syncing: false, syncError: action.error }

    case 'SYNC_START':
      return { ...state, syncing: true, syncError: null }

    case 'SYNC_OK':
      return { ...state, syncing: false }

    case 'SYNC_ERROR':
      return { ...state, syncing: false, syncError: action.error }

    case 'UPSERT_SESSION': {
      const exists = state.sessions.findIndex(s => s.id === action.session.id)
      const merged = exists >= 0
        ? state.sessions.map((s, i) => i === exists ? action.session : s)
        : [action.session, ...state.sessions]
      const sessions = merged.slice().sort((a, b) => b.date.localeCompare(a.date))
      return { ...state, sessions }
    }

    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.id) }

    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.exercise] }

    case 'DELETE_EXERCISE':
      return { ...state, exercises: state.exercises.filter(e => e.id !== action.id) }

    case 'IMPORT_DATA':
      return { ...state, exercises: action.plan.exercises, sessions: action.plan.sessions }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [loadAttempt, setLoadAttempt] = useState(0)
  // 로컬 파일에서 막 로드한 직후엔 동일 데이터를 다시 저장하지 않도록 플래그
  const justLoadedRef = useRef(false)

  // 앱 전용 로컬 파일에서 데이터 로드
  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'LOAD_START' })
    loadLocalWorkoutData()
      .then(data => {
        if (cancelled) return
        justLoadedRef.current = true
        dispatch({
          type: 'LOAD_DATA',
          exercises: mergeDefaultExercises(data?.exercises ?? []),
          sessions: data?.sessions ?? [],
        })
      })
      .catch(err => {
        if (cancelled) return
        // 읽기 실패를 빈 데이터로 취급하면 이후 저장이 기존 기록을 덮을 수 있다.
        dispatch({ type: 'LOAD_ERROR', error: err.message })
      })

    return () => { cancelled = true }
  }, [loadAttempt])

  const persist = useCallback(async (exercises, sessions) => {
    dispatch({ type: 'SYNC_START' })
    try {
      await saveLocalWorkoutData({ exercises, sessions })
      dispatch({ type: 'SYNC_OK' })
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', error: err.message })
    }
  }, [])

  // 데이터 변경 시 자동 저장 (로드 직후 첫 번째 실행은 건너뜀)
  // 연속 변경 (StepperInput 등) 시 로컬 파일 쓰기 폭주 방지를 위해 500ms 디바운스
  useEffect(() => {
    if (!state.loaded) return
    if (justLoadedRef.current) {
      justLoadedRef.current = false
      return
    }
    const id = setTimeout(() => persist(state.exercises, state.sessions), 500)
    return () => clearTimeout(id)
  }, [state.exercises, state.sessions, state.loaded, persist])

  const upsertSession = useCallback((session) => dispatch({ type: 'UPSERT_SESSION', session }), [])
  const deleteSession = useCallback((id) => dispatch({ type: 'DELETE_SESSION', id }), [])
  const addExercise = useCallback((exercise) => dispatch({ type: 'ADD_EXERCISE', exercise }), [])
  const deleteExercise = useCallback((id) => dispatch({ type: 'DELETE_EXERCISE', id }), [])
  const importWorkoutData = useCallback((data) => {
    const plan = planWorkoutImport(state, data)
    if (plan.addedCount) dispatch({ type: 'IMPORT_DATA', plan })
    return plan
  }, [state])
  const retrySave = useCallback(() => persist(state.exercises, state.sessions), [persist, state.exercises, state.sessions])
  const getLastSession = useCallback((exerciseId, excludeDate = null) => {
    return state.sessions.find(s =>
      s.date !== excludeDate &&
      s.exercises?.some(e => e.exerciseId === exerciseId)
    ) ?? null
  }, [state.sessions])

  // 로컬 데이터가 준비되기 전에 Session 화면이 빈 sessions로 초기화되지 않도록
  // 자식 화면 전체의 마운트를 보류한다.
  if (!state.loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        {state.syncError ? (
          <div className="text-center max-w-sm">
            <p className="text-white font-semibold">Could not load your workouts</p>
            <p className="text-zinc-500 text-sm mt-2">The local workout file could not be read.</p>
            <button
              type="button"
              onClick={() => setLoadAttempt(attempt => attempt + 1)}
              className="mt-5 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm active:bg-blue-500"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 mx-auto border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm mt-3">Loading workouts...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <AppContext.Provider value={{
      ...state,
      upsertSession,
      deleteSession,
      addExercise,
      deleteExercise,
      getLastSession,
      importWorkoutData,
      retrySave,
    }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- 훅과 프로바이더를 같은 파일에 공존시키는 표준 패턴
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
