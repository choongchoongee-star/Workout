import { useEffect, useRef } from 'react'

export default function RestTimer({ seconds, total, onDone, onSkip }) {
  const pct = total > 0 ? (seconds / total) * 100 : 0
  const intervalRef = useRef(null)

  useEffect(() => {
    if (seconds <= 0) {
      onDone?.()
    }
  }, [seconds, onDone])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="fixed bottom-20 left-0 right-0 mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-xl z-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400 text-sm">휴식 중</span>
        <button
          onClick={onSkip}
          className="text-zinc-400 text-sm active:text-white"
        >
          건너뛰기
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#3f3f46" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
            {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : secs}
          </span>
        </div>
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
