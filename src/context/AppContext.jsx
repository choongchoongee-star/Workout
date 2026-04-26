import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { DEFAULT_EXERCISES } from '../data/exercises'
import { loadWorkoutData, saveWorkoutData } from '../lib/firestore'
import { useAuth } from './AuthContext'

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
    case 'LOAD_DATA':
      return {
        ...state,
        exercises: action.exercises,
        sessions: action.sessions,
        loaded: true,
      }

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

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  // Firestore에서 막 로드한 직후엔 동일 데이터를 다시 저장하지 않도록 플래그
  const justLoadedRef = useRef(false)

  // 로그인한 유저가 바뀔 때마다 Firestore에서 데이터 로드
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [] })
      return
    }
    dispatch({ type: 'SYNC_START' })
    loadWorkoutData(user.uid)
      .then(data => {
        justLoadedRef.current = true
        dispatch({
          type: 'LOAD_DATA',
          exercises: data.exercises ?? DEFAULT_EXERCISES,
          sessions: data.sessions ?? [],
        })
      })
      .catch(err => {
        dispatch({ type: 'SYNC_ERROR', error: err.message })
        justLoadedRef.current = true // 에러 fallback도 auto-save 건너뜀 (빈 데이터 덮어씌움 방지)
        dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [] })
      })
  }, [user])

  const persist = useCallback(async (exercises, sessions) => {
    if (!user) return
    dispatch({ type: 'SYNC_START' })
    try {
      await saveWorkoutData(user.uid, { exercises, sessions })
      dispatch({ type: 'SYNC_OK' })
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', error: err.message })
    }
  }, [user])

  // 데이터 변경 시 자동 저장 (로드 직후 첫 번째 실행은 건너뜀)
  // 연속 변경 (StepperInput 등) 시 Firestore 쓰기 폭주 방지를 위해 500ms 디바운스
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
  const getLastSession = useCallback((exerciseId, excludeDate = null) => {
    return state.sessions.find(s =>
      s.date !== excludeDate &&
      s.exercises?.some(e => e.exerciseId === exerciseId)
    ) ?? null
  }, [state.sessions])

  return (
    <AppContext.Provider value={{
      ...state,
      upsertSession,
      deleteSession,
      addExercise,
      deleteExercise,
      getLastSession,
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
