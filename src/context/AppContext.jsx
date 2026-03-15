import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { DEFAULT_EXERCISES } from '../data/exercises'
import { storage } from '../lib/storage'
import { loadGist, saveGist } from '../lib/gist'

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
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load from Gist on mount
  useEffect(() => {
    const token = storage.getGithubToken()
    const gistId = storage.getGistId()
    if (!token || !gistId) {
      dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [], inbody: [] })
      return
    }
    dispatch({ type: 'SYNC_START' })
    loadGist(token, gistId)
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
  }, [])

  const persist = useCallback(async (exercises, sessions, inbody) => {
    const token = storage.getGithubToken()
    const gistId = storage.getGistId()
    if (!token || !gistId) return
    dispatch({ type: 'SYNC_START' })
    try {
      await saveGist(token, gistId, { exercises, sessions, inbody })
      dispatch({ type: 'SYNC_OK' })
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', error: err.message })
    }
  }, [])

  // Auto-persist on data changes
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

  // 가장 최근 InBody 기록 반환
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
