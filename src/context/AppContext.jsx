import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { DEFAULT_EXERCISES } from '../data/exercises'
import { loadWorkoutData, saveWorkoutData } from '../lib/firestore'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

const initialState = {
  exercises: DEFAULT_EXERCISES,
  sessions: [],
  inbody: [],
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
        inbody: action.inbody ?? [],
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
      const sessions = exists >= 0
        ? state.sessions.map((s, i) => i === exists ? action.session : s)
        : [action.session, ...state.sessions]
      return { ...state, sessions }
    }

    case 'DELETE_SESSION':
      return { ...state, sessions: state.sessions.filter(s => s.id !== action.id) }

    case 'ADD_EXERCISE':
      return { ...state, exercises: [...state.exercises, action.exercise] }

    case 'DELETE_EXERCISE':
      return { ...state, exercises: state.exercises.filter(e => e.id !== action.id) }

    case 'ADD_INBODY':
      return { ...state, inbody: [action.record, ...state.inbody] }

    case 'DELETE_INBODY':
      return { ...state, inbody: state.inbody.filter(r => r.id !== action.id) }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  // 로그인한 유저가 바뀔 때마다 Firestore에서 데이터 로드
  useEffect(() => {
    if (!user) {
      // 로그아웃 시 상태 초기화
      dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [], inbody: [] })
      return
    }
    dispatch({ type: 'SYNC_START' })
    loadWorkoutData(user.uid)
      .then(data => {
        dispatch({
          type: 'LOAD_DATA',
          exercises: data.exercises ?? DEFAULT_EXERCISES,
          sessions: data.sessions ?? [],
          inbody: data.inbody ?? [],
        })
      })
      .catch(err => {
        dispatch({ type: 'SYNC_ERROR', error: err.message })
        dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [], inbody: [] })
      })
  }, [user])

  const persist = useCallback(async (exercises, sessions, inbody) => {
    if (!user) return
    dispatch({ type: 'SYNC_START' })
    try {
      await saveWorkoutData(user.uid, { exercises, sessions, inbody })
      dispatch({ type: 'SYNC_OK' })
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', error: err.message })
    }
  }, [user])

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    if (!state.loaded) return
    persist(state.exercises, state.sessions, state.inbody)
  }, [state.exercises, state.sessions, state.inbody, state.loaded, persist])

  const upsertSession = useCallback((session) => dispatch({ type: 'UPSERT_SESSION', session }), [])
  const deleteSession = useCallback((id) => dispatch({ type: 'DELETE_SESSION', id }), [])
  const addExercise = useCallback((exercise) => dispatch({ type: 'ADD_EXERCISE', exercise }), [])
  const deleteExercise = useCallback((id) => dispatch({ type: 'DELETE_EXERCISE', id }), [])
  const addInBody = useCallback((record) => dispatch({ type: 'ADD_INBODY', record }), [])
  const deleteInBody = useCallback((id) => dispatch({ type: 'DELETE_INBODY', id }), [])

  const getLastSession = useCallback((exerciseId, excludeDate = null) => {
    return state.sessions.find(s =>
      s.date !== excludeDate &&
      s.exercises?.some(e => e.exerciseId === exerciseId)
    ) ?? null
  }, [state.sessions])

  const getLatestInBody = useCallback(() => {
    return state.inbody[0] ?? null
  }, [state.inbody])

  return (
    <AppContext.Provider value={{
      ...state,
      upsertSession,
      deleteSession,
      addExercise,
      deleteExercise,
      addInBody,
      deleteInBody,
      getLastSession,
      getLatestInBody,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
