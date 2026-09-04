import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/dateUtils'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sessions, exercises, deleteSession } = useApp()

  const session = sessions.find(s => s.id === id)
  if (!session) return (
    <div className="p-4 text-center py-20">
      <p className="text-zinc-500">Workout not found.</p>
      <button onClick={() => navigate('/history')} className="text-blue-400 mt-4 text-sm">← Back to history</button>
    </div>
  )

  function handleDelete() {
    deleteSession(id)
    navigate('/history', { state: { undoSession: session } })
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate('/history')} aria-label="Go back" className="text-zinc-400 active:text-white">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">{formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</h1>
          {session.duration_min > 0 && (
            <p className="text-zinc-500 text-sm">{session.duration_min} min</p>
          )}
        </div>
        <button
          onClick={() => navigate('/session', { state: { date: session.date } })}
          className="text-blue-400 text-sm active:text-blue-300"
        >
          Edit
        </button>
        <button onClick={handleDelete} className="text-red-500 text-sm active:text-red-400">Delete</button>
      </div>

      <div className="space-y-4">
        {(session.exercises ?? []).length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">No exercises recorded.</p>
        )}
        {(session.exercises ?? []).map((se, i) => {
          const exercise = exercises.find(e => e.id === se.exerciseId)
          const isCardio = exercise?.type === 'cardio'

          return (
            <div key={i} className="bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 min-w-0">
                <h3 className="text-white font-semibold truncate">{exercise?.name || se.exerciseId}</h3>
                <span className="text-zinc-600 text-xs flex-shrink-0">{exercise?.category}</span>
              </div>

              {isCardio ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {se.sets[0] && Object.entries({
                    'Duration': se.sets[0].duration_min != null ? `${se.sets[0].duration_min} min` : null,
                    'Distance': se.sets[0].distance_km != null ? `${se.sets[0].distance_km}km` : null,
                    'Speed': se.sets[0].speed_kmh != null ? `${se.sets[0].speed_kmh}km/h` : null,
                    'Incline': se.sets[0].incline_pct != null ? `${se.sets[0].incline_pct}%` : null,
                    'Calories': se.sets[0].calories != null ? `${se.sets[0].calories}kcal` : null,
                  }).filter(([, v]) => v !== null).map(([label, value]) => (
                    <div key={label}>
                      <span className="text-zinc-500 text-xs">{label}</span>
                      <p className="text-white">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {se.sets.map((set, si) => (
                    <div key={si} className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-600 w-4 text-right">{si + 1}</span>
                      {exercise?.type === 'bodyweight' ? (
                        <span className="text-zinc-300">
                          Bodyweight{set.added_weight ? `+${set.added_weight}kg` : ''} × {set.reps} reps
                        </span>
                      ) : (
                        <span className="text-zinc-300">{set.weight ?? '?'}kg × {set.reps} reps</span>
                      )}
                      {set.done && <span className="text-green-500 text-xs ml-auto">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
