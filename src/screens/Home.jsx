import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, localTodayStr } from '../lib/dateUtils'
import { getMainCategory, getLatestCategoryExerciseIds } from '../lib/sessionUtils'
import { CATEGORIES } from '../data/exercises'

function StartWorkoutModal({ sessions, exercises, onClose, onStart }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const modalRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const loadableIds = selectedCategory
    ? getLatestCategoryExerciseIds(sessions, exercises, selectedCategory)
    : []
  const canLoadPast = loadableIds.length > 0

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="운동 시작"
        className="bg-zinc-900 rounded-t-2xl mt-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                aria-label="뒤로"
                className="text-zinc-400 active:text-white text-lg"
              >
                ←
              </button>
            )}
            <h3 className="text-white font-semibold">
              {selectedCategory ? selectedCategory : '어떤 부위 운동할까요?'}
            </h3>
          </div>
          <button onClick={onClose} aria-label="닫기" className="text-zinc-400 active:text-white p-1">✕</button>
        </div>

        {!selectedCategory ? (
          <div className="p-4 grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className="bg-zinc-800 active:bg-blue-600 text-white text-sm font-medium rounded-xl py-4 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <button
              onClick={() => onStart(null)}
              className="w-full bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl py-4 transition-colors"
            >
              처음부터 시작
            </button>
            <button
              onClick={() => canLoadPast && onStart(loadableIds)}
              disabled={!canLoadPast}
              className={`w-full font-semibold rounded-xl py-4 transition-colors ${
                canLoadPast
                  ? 'bg-zinc-800 active:bg-zinc-700 text-white'
                  : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {canLoadPast
                ? `과거 ${selectedCategory} 운동 불러오기`
                : `${selectedCategory} 과거 기록 없음`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { sessions, exercises, syncing, syncError, loaded } = useApp()
  const today = localTodayStr()
  const recent = sessions.slice(0, 5)
  const todaySession = sessions.find(s => s.id === today)
  const [showStartModal, setShowStartModal] = useState(false)

  function handleStartClick() {
    if (todaySession) {
      navigate('/session')
    } else {
      setShowStartModal(true)
    }
  }

  function handleStart(presetExerciseIds) {
    setShowStartModal(false)
    if (presetExerciseIds?.length) {
      navigate('/session', { state: { presetExerciseIds } })
    } else {
      navigate('/session')
    }
  }

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
        onClick={handleStartClick}
        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-lg rounded-2xl py-5 mb-6 transition-colors"
      >
        {todaySession ? '오늘 세션 이어하기 💪' : '오늘 운동 시작 💪'}
      </button>

      {/* Recent sessions */}
      <h2 className="text-zinc-400 text-sm font-medium mb-3">최근 기록</h2>
      {!loaded ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-1" />
              <div className="h-3 bg-zinc-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
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
            const mainCategory = getMainCategory(sessionExercises, exercises)

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
                <p className="text-zinc-600 text-xs mt-1">
                  {mainCategory && <span className="text-blue-400">메인: {mainCategory}</span>}
                  {mainCategory && ' · '}
                  {totalSets}세트
                </p>
              </button>
            )
          })}
        </div>
      )}
      {sessions.length > 5 && (
        <button
          onClick={() => navigate('/history')}
          className="w-full mt-3 text-zinc-500 text-sm py-2 active:text-zinc-300"
        >
          기록 전체 보기 →
        </button>
      )}

      {showStartModal && (
        <StartWorkoutModal
          sessions={sessions}
          exercises={exercises}
          onClose={() => setShowStartModal(false)}
          onStart={handleStart}
        />
      )}
    </div>
  )
}
