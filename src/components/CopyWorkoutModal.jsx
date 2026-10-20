import { useEffect, useMemo, useRef, useState } from 'react'
import { copyWorkoutExercises } from '../lib/copyWorkout'
import { localizedMovementName as movementName } from '../lib/exerciseLabels'
import { EQUIPMENT_LABELS, recordEquipment } from '../lib/equipment'
import { t } from '../lib/i18n'

export default function CopyWorkoutModal({ sessions, exercises, targetDate, onCopy, onClose }) {
  const dialogRef = useRef(null)
  const submitted = useRef(false)
  const [filterDate, setFilterDate] = useState('')
  const [source, setSource] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const allRef = useRef(null)
  const history = useMemo(() => sessions.filter(s => s.date < targetDate)
    .map(s => ({ date: s.date, cards: copyWorkoutExercises(s, exercises) }))
    .filter(s => s.cards.length > 0).sort((a, b) => b.date.localeCompare(a.date)), [sessions, exercises, targetDate])
  const visible = filterDate ? history.filter(s => s.date === filterDate) : history
  const cards = source?.cards ?? []
  const chosen = cards.filter((_, i) => selected.has(i))
  const setCount = chosen.reduce((sum, card) => sum + card.sets.length, 0)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selected.size > 0 && selected.size < cards.length
  }, [selected, cards.length])

  function chooseSession(session) {
    setSource(session)
    setSelected(new Set(session.cards.map((_, i) => i)))
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="copy-workout-title" onCancel={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/70">
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-2xl bg-zinc-900 text-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between gap-2 border-b border-zinc-700 p-4">
          <h3 id="copy-workout-title" className="font-semibold">{t(source ? 'Choose exercises to copy' : 'Copy previous workout')}</h3>
          {source ? (
            <button type="button" onClick={() => setSource(null)} className="min-h-11 shrink-0 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-300">{source.date}</button>
          ) : (
            <input type="date" aria-label={t('Find workout by date')} value={filterDate}
              max={targetDate} onChange={e => setFilterDate(e.target.value)}
              className="min-h-11 min-w-0 max-w-[48%] rounded-lg bg-zinc-800 px-2 text-sm text-zinc-300" />
          )}
        </div>
        <div className="overflow-y-auto p-4">
          {!source ? <>
            <p className="mb-3 text-sm text-zinc-500">{t('Choose from the list or find a date above.')}</p>
            <p className="mb-3 text-xs text-zinc-500">{t('Add to {date}', { date: targetDate })}</p>
            {filterDate && <button type="button" onClick={() => setFilterDate('')} className="mb-2 min-h-11 text-sm text-accent-400">{t('Show all workouts')}</button>}
            {visible.map(session => (
              <button type="button" key={session.date} onClick={() => chooseSession(session)} className="flex w-full items-center justify-between gap-3 border-b border-zinc-700 py-4 text-left">
                <span className="min-w-0"><strong>{session.date}</strong>
                  <span className="mt-1 block text-sm text-zinc-500">{session.cards.map(card => movementName(exercises.find(ex => ex.id === card.exerciseId))).join(' · ')}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{t('{count} exercises · {sets} sets', { count: session.cards.length, sets: session.cards.reduce((sum, card) => sum + card.sets.length, 0) })}</span>
                </span><span aria-hidden="true">›</span>
              </button>
            ))}
            {visible.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">{t(filterDate ? 'No workouts to copy on this date.' : 'No previous workouts to copy.')}</p>}
          </> : <>
            <p className="mb-3 text-sm text-zinc-500">{t('Uncheck any exercises you do not need.')}</p>
            <label className="flex min-h-11 items-center gap-3 border-b border-zinc-700">
              <input ref={allRef} type="checkbox" checked={selected.size === cards.length} onChange={e => setSelected(e.target.checked ? new Set(cards.map((_, i) => i)) : new Set())} className="h-5 w-5 accent-accent-500" />{t('Select all')}
            </label>
            {cards.map((card, i) => {
              const exercise = exercises.find(ex => ex.id === card.exerciseId)
              return <label key={i} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-zinc-700 py-4">
                <input type="checkbox" checked={selected.has(i)} onChange={e => setSelected(prev => { const next = new Set(prev); if (e.target.checked) next.add(i); else next.delete(i); return next })} className="h-5 w-5 shrink-0 accent-accent-500" />
                <span><strong>{movementName(exercise)}</strong><span className="mt-1 block text-sm text-zinc-500">{t(EQUIPMENT_LABELS[recordEquipment(card, exercise)] ?? 'Unspecified')} · {t('{count} sets', { count: card.sets.length })}</span></span>
              </label>
            })}
          </>}
        </div>
        <div className="shrink-0 border-t border-zinc-700 p-4">
          {source && <>
            <p aria-live="polite" className="mb-2 text-sm text-zinc-500">{t('{count} exercises · {sets} sets', { count: chosen.length, sets: setCount })}</p>
            <button type="button" disabled={!chosen.length} onClick={() => {
              if (submitted.current || !chosen.length) return
              submitted.current = true
              onCopy(chosen)
            }} className="min-h-11 w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40">{t('Copy {count} selected exercises', { count: chosen.length })}</button>
            <p className="mt-2 text-xs text-zinc-500">{t('Existing records stay. Copied sets start incomplete.')}</p>
          </>}
          <button type="button" onClick={onClose} className="mt-1 min-h-11 w-full text-sm text-zinc-400">{t('Close')}</button>
        </div>
      </div>
    </dialog>
  )
}
