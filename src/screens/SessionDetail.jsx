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
      <p className="text-zinc-500">세션을 찾을 수 없습니다</p>
      <button onClick={() => navigate('/history')} className="text-blue-400 mt-4 text-sm">← 기록으로</button>
    </div>
  )

  function handleDelete() {
    deleteSession(id)
    navigate('/history', { state: { undoSession: session } })
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button onClick={() => navigate('/history')} aria-label="뒤로가기" className="text-zinc-400 active:text-white">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">{formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</h1>
          {session.duration_min > 0 && (
            <p className="text-zinc-500 text-sm">{session.duration_min}분</p>
          )}
        </div>
        <button
          onClick={() => navigate('/session', { state: { date: session.date } })}
          className="text-blue-400 text-sm active:text-blue-300"
        >
          수정
        </button>
        <button onClick={handleDelete} className="text-red-500 text-sm active:text-red-400">삭제</button>
      </div>

      <div className="space-y-4">
        {(session.exercises ?? []).length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">기록된 운동이 없습니다</p>
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
                    '시간': se.sets[0].duration_min != null ? `${se.sets[0].duration_min}분` : null,
                    '거리': se.sets[0].distance_km != null ? `${se.sets[0].distance_km}km` : null,
                    '속도': se.sets[0].speed_kmh != null ? `${se.sets[0].speed_kmh}km/h` : null,
                    '경사': se.sets[0].incline_pct != null ? `${se.sets[0].incline_pct}%` : null,
                    '칼로리': se.sets[0].calories != null ? `${se.sets[0].calories}kcal` : null,
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
                          체중{set.added_weight ? `+${set.added_weight}kg` : ''} × {set.reps}회
                        </span>
                      ) : (
                        <span className="text-zinc-300">{set.weight ?? '?'}kg × {set.reps}회</span>
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
