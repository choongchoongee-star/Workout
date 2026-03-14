import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export default function History() {
  const navigate = useNavigate()
  const { sessions, exercises } = useApp()

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4 pt-2">운동 기록</h1>

      {sessions.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">아직 기록이 없어요</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const totalSets = session.exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0)
            const names = session.exercises
              .map(e => exercises.find(ex => ex.id === e.exerciseId)?.name || e.exerciseId)
              .slice(0, 3)

            return (
              <button
                key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-zinc-900 rounded-xl p-4 text-left active:bg-zinc-800"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white font-medium">{formatDate(session.date)}</span>
                  <span className="text-zinc-500 text-sm">
                    {session.duration_min ? `${session.duration_min}분` : ''}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  {names.join(' · ')}{session.exercises.length > 3 ? ` +${session.exercises.length - 3}` : ''}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{session.exercises.length}종목 · {totalSets}세트</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
