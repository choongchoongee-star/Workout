import { t } from '../lib/i18n'
import { useCallback, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, localTodayStr } from '../lib/dateUtils'
import { getMainCategory } from '../lib/sessionUtils'
import UndoToast from '../components/UndoToast'
import SwipeToDelete from '../components/SwipeToDelete'

export default function History() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sessions, exercises, upsertSession, deleteSession, syncError } = useApp()
  const [jumpDate, setJumpDate] = useState(() => localTodayStr())
  const cardRefs = useRef({})
  const [editing, setEditing] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const selected = sessions.filter(session => selectedIds.has(session.id))
  const allSelected = sessions.length > 0 && selected.length === sessions.length

  // 세션 삭제 되돌리기
  const [undoBatch, setUndoBatch] = useState(() => location.state?.undoSession
    ? { token: 0, sessions: [location.state.undoSession] } : null)
  const undoToken = useRef(0)
  // location.state 소비 후 제거 (새로고침 시 재표시 방지)
  if (location.state?.undoSession) {
    window.history.replaceState({}, '')
  }

  const handleUndoRestore = useCallback(() => {
    for (const session of undoBatch?.sessions ?? []) upsertSession(session)
  }, [undoBatch, upsertSession])

  const handleUndoDismiss = useCallback(() => {
    setUndoBatch(null)
  }, [])

  function removeSessions(records) {
    if (!records.length) return
    setUndoBatch({ token: ++undoToken.current, sessions: records })
    for (const session of records) deleteSession(session.id)
    setSelectedIds(previous => {
      const next = new Set(previous)
      for (const session of records) next.delete(session.id)
      return next
    })
  }

  function toggleSelected(id) {
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDateJump(dateStr) {
    setJumpDate(dateStr)
    if (!dateStr) return
    const el = cardRefs.current[dateStr]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4 pt-2">
        <h1 className="min-w-0 flex-1 text-xl font-bold text-white">{t("Workout history")}</h1>
        {(sessions.length > 0 || editing) && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" aria-pressed={editing}
            onClick={() => { setEditing(value => !value); setSelectedIds(new Set()) }}
            className="min-h-11 min-w-11 text-sm font-medium text-accent-400 active:bg-zinc-800 rounded-lg">
            {editing ? t('Done') : t('Edit history')}
          </button>
          <input
            type="date"
            aria-label={t('History date')}
            value={jumpDate}
            onChange={e => handleDateJump(e.target.value)}
            className="ml-auto bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
          </div>
        )}
      </div>

      {editing && sessions.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={allSelected}
              ref={el => { if (el) el.indeterminate = selected.length > 0 && !allSelected }}
              onChange={() => setSelectedIds(allSelected ? new Set() : new Set(sessions.map(session => session.id)))}
              className="h-5 w-5 accent-accent-500" />
            {t('Select all')}
          </label>
          <button type="button" disabled={!selected.length} onClick={() => removeSessions(selected)}
            className="min-h-11 rounded-lg px-3 text-sm text-red-400 active:bg-zinc-800 disabled:opacity-40">
            {t('Delete selected ({count})', { count: selected.length })}
          </button>
        </div>
      )}
      {!editing && sessions.length > 0 && <p className="mb-2 text-xs text-zinc-500">{t("Swipe a workout left to delete.")}</p>}

      {syncError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-300">{t("Could not save your workout on this device.")}</div>
      )}

      {sessions.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">{t("No workouts yet.")}</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const mainCategory = getMainCategory(session.exercises ?? [], exercises)
            if (editing) return (
              <div key={session.id} ref={el => { cardRefs.current[session.date] = el }}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 p-2">
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 p-2">
                  <input type="checkbox" checked={selectedIds.has(session.id)}
                    onChange={() => toggleSelected(session.id)}
                    aria-label={t('Select workout on {date}', { date: session.date })}
                    className="h-5 w-5 shrink-0 accent-accent-500" />
                  <span className="min-w-0 text-sm text-white">
                    {formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    {mainCategory && <span className="block text-xs text-accent-400">{t(mainCategory)}</span>}
                  </span>
                </label>
                <button type="button" onClick={() => removeSessions([session])}
                  aria-label={t('Delete workout on {date}', { date: session.date })}
                  className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm text-red-400 active:bg-zinc-800">{t('Delete')}</button>
              </div>
            )
            return (
              <SwipeToDelete
                key={session.id}
                label={t('workout on {date}', { date: session.date })}
                className="rounded-xl"
                surfaceClassName="bg-zinc-900"
                onDelete={() => removeSessions([session])}
              >
              <button
                ref={el => { cardRefs.current[session.date] = el }}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-zinc-900 rounded-xl p-4 text-left active:bg-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  {mainCategory && (
                    <span className="text-accent-400 text-sm font-medium">{t(mainCategory)}</span>
                  )}
                </div>
              </button>
              </SwipeToDelete>
            )
          })}
        </div>
      )}

      {undoBatch && (
        <UndoToast
          key={undoBatch.token}
          message={undoBatch.sessions.length === 1 ? t("Workout deleted") : t('{count} workouts deleted', { count: undoBatch.sessions.length })}
          onUndo={handleUndoRestore}
          onDismiss={handleUndoDismiss}
        />
      )}
    </div>
  )
}
