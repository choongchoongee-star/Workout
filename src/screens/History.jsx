import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/dateUtils'

export default function History() {
  const navigate = useNavigate()
  const { sessions, exercises } = useApp()
  const [jumpDate, setJumpDate] = useState('')
  const cardRefs = useRef({})

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
        <h1 className="text-xl font-bold text-white">운동 기록</h1>
        {sessions.length > 0 && (
          <input
            type="date"
            value={jumpDate}
            onChange={e => handleDateJump(e.target.value)}
            className="ml-auto bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">아직 기록이 없어요</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const sessionExercises = session.exercises ?? []
            const totalSets = sessionExercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0)
            const names = sessionExercises
              .map(e => exercises.find(ex => ex.id === e.exerciseId)?.name || e.exerciseId)
              .slice(0, 3)

            return (
              <button
                key={session.id}
                ref={el => { cardRefs.current[session.date] = el }}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-zinc-900 rounded-xl p-4 text-left active:bg-zinc-800"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white font-medium">{formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <span className="text-zinc-500 text-sm">
                    {session.duration_min ? `${session.duration_min}분` : ''}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  {names.join(' · ')}{sessionExercises.length > 3 ? ` +${sessionExercises.length - 3}` : ''}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{sessionExercises.length}종목 · {totalSets}세트</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
