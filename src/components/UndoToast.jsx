import { useEffect, useState } from 'react'

const DURATION = 5000

export default function UndoToast({ message, onUndo, onDismiss }) {
  const [remaining, setRemaining] = useState(DURATION)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 50) {
          clearInterval(interval)
          onDismiss()
          return 0
        }
        return prev - 50
      })
    }, 50)
    return () => clearInterval(interval)
  }, [onDismiss])

  function handleUndo() {
    onUndo()
    onDismiss()
  }

  const progress = remaining / DURATION

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-up">
      <div className="bg-zinc-800 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-white text-sm">{message}</span>
          <button
            onClick={handleUndo}
            className="text-blue-400 text-sm font-semibold ml-4 flex-shrink-0 active:text-blue-300"
          >
            되돌리기
          </button>
        </div>
        <div className="h-0.5 bg-zinc-700">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
