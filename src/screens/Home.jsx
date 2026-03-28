import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, localTodayStr } from '../lib/dateUtils'

export default function Home() {
  const navigate = useNavigate()
  const { sessions, exercises, syncing, syncError } = useApp()
  const today = localTodayStr()
  const recent = sessions.slice(0, 5)
  const todaySession = sessions.find(s => s.id === today)

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <p className="text-zinc-400 text-sm">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Workout</h1>
        </div>
        {syncing && (
          <span className="text-xs text-zinc-500 animate-pulse">동기화 중...</span>
        )}
      </div>

      {syncError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-300">
          데이터 동기화에 실패했습니다. 네트워크를 확인해주세요.
        </div>
      )}

      {/* Start workout button */}
      <button
        onClick={() => navigate('/session')}
        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-lg rounded-2xl py-5 mb-6 transition-colors"
      >
        {todaySession ? '오늘 세션 이어하기 💪' : '오늘 운동 시작 💪'}
      </button>

      {/* Recent sessions */}
      <h2 className="text-zinc-400 text-sm font-medium mb-3">최근 기록</h2>
      {recent.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-8">아직 기록이 없어요</p>
      ) : (
        <div className="space-y-2">
          {recent.map(session => {
            const sessionExercises = session.exercises ?? []
            const exerciseNames = sessionExercises
              .map(e => exercises.find(ex => ex.id === e.exerciseId)?.name || e.exerciseId)
              .slice(0, 3)
            const totalSets = sessionExercises
              .reduce((sum, e) => sum + (e.sets?.length || 0), 0)

            return (
              <button
                key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-zinc-900 rounded-xl p-4 text-left active:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">{formatDate(session.date, { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <span className="text-zinc-500 text-sm">
                    {session.duration_min ? `${session.duration_min}분` : ''}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm">
                  {exerciseNames.join(' · ')}
                  {sessionExercises.length > 3 && ` +${sessionExercises.length - 3}`}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{totalSets}세트</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
