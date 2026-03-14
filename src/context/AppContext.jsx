import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { DEFAULT_EXERCISES } from '../data/exercises'
import { storage } from '../lib/storage'
import { loadGist, saveGist } from '../lib/gist'

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
      return { ...state, exercises: action.exercises, sessions: action.sessions, loaded: true }

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
      dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [] })
      return
    }
    dispatch({ type: 'SYNC_START' })
    loadGist(token, gistId)
      .then(data => {
        dispatch({ type: 'LOAD_DATA', exercises: data.exercises || DEFAULT_EXERCISES, sessions: data.sessions || [] })
      })
      .catch(err => {
        dispatch({ type: 'SYNC_ERROR', error: err.message })
        dispatch({ type: 'LOAD_DATA', exercises: DEFAULT_EXERCISES, sessions: [] })
      })
  }, [])

  // Persist to Gist whenever exercises or sessions change (after initial load)
  const persist = useCallback(async (exercises, sessions) => {
    const token = storage.getGithubToken()
    const gistId = storage.getGistId()
    if (!token || !gistId) return
    dispatch({ type: 'SYNC_START' })
    try {
      await saveGist(token, gistId, { exercises, sessions })
      dispatch({ type: 'SYNC_OK' })
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', error: err.message })
    }
  }, [])

  const upsertSession = useCallback((session) => {
    dispatch({ type: 'UPSERT_SESSION', session })
    // Persist after state update via effect
  }, [])

  const deleteSession = useCallback((id) => {
    dispatch({ type: 'DELETE_SESSION', id })
  }, [])

  const addExercise = useCallback((exercise) => {
    dispatch({ type: 'ADD_EXERCISE', exercise })
  }, [])

  const deleteExercise = useCallback((id) => {
    dispatch({ type: 'DELETE_EXERCISE', id })
  }, [])

  // Auto-persist on data changes
  useEffect(() => {
    if (!state.loaded) return
    persist(state.exercises, state.sessions)
  }, [state.exercises, state.sessions, state.loaded, persist])

  const getLastSession = useCallback((exerciseId, excludeDate = null) => {
    return state.sessions.find(s =>
      s.date !== excludeDate &&
      s.exercises.some(e => e.exerciseId === exerciseId)
    ) || null
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

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
