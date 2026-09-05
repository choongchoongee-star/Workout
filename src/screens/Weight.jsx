import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/exercises'
import { formatDate } from '../lib/dateUtils'

// 세트 한 줄 요약 (타입별)
function summarizeSet(set, type) {
  if (type === 'cardio') {
    const parts = []
    if (set.duration_min != null) parts.push(`${set.duration_min} min`)
    if (set.distance_km != null) parts.push(`${set.distance_km}km`)
    if (set.speed_kmh != null) parts.push(`${set.speed_kmh}km/h`)
    if (set.incline_pct != null) parts.push(`Incline ${set.incline_pct}%`)
    if (set.calories != null) parts.push(`${set.calories}kcal`)
    return parts.join(' · ') || 'History'
  }
  if (type === 'bodyweight') {
    return `${set.added_weight ?? 0}kg × ${set.reps ?? '?'} reps`
  }
  return `${set.weight ?? '?'}kg × ${set.reps ?? '?'} reps`
}

export default function Weight() {
  const { exercises, sessions, loaded } = useApp()
  const [selected, setSelected] = useState(null) // 선택된 exercise 객체 (null = 선택 화면)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = ['All', ...CATEGORIES]

  // 선택 화면: 카테고리/검색 필터된 운동 목록
  const filtered = useMemo(() => exercises.filter(e => {
    const matchCat = activeCategory === 'All' || e.category === activeCategory
    const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  }), [exercises, activeCategory, query])

  // 상세 화면: 선택한 운동의 날짜별 기록 (세션은 이미 날짜 역순 정렬)
  const records = useMemo(() => {
    if (!selected) return []
    return sessions
      .map(s => {
        const se = (s.exercises ?? []).find(e => e.exerciseId === selected.id)
        if (!se || !(se.sets?.length)) return null
        return { date: s.date, sets: se.sets }
      })
      .filter(Boolean)
  }, [sessions, selected])

  // ===== 상세 화면 =====
  if (selected) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5 pt-2">
          <button
            onClick={() => setSelected(null)}
            aria-label="Choose another exercise"
            className="text-zinc-400 active:text-white text-lg"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{selected.name}</h1>
            <span className="text-zinc-500 text-xs">{selected.category}</span>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-12">No history for this exercise yet.</p>
        ) : (
          <div className="space-y-4">
            {records.map(({ date, sets }) => (
              <div key={date}>
                <h2 className="text-zinc-400 text-sm font-medium mb-1.5">
                  {formatDate(date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                </h2>
                <div className="bg-zinc-900 rounded-xl px-4 py-2.5 space-y-1.5">
                  {sets.map((set, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-zinc-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-zinc-200">{summarizeSet(set, selected.type)}</span>
                      {set.done && <span className="text-green-500 text-xs ml-auto">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ===== 운동 선택 화면 =====
  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white mb-4 pt-2">Exercise history</h1>

      <input
        type="text"
        placeholder="Search exercises..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
      />

      <div className="flex gap-2 overflow-x-auto mb-4 no-scrollbar">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full transition-colors ${
              activeCategory === c ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {!loaded ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => { setSelected(ex); setQuery('') }}
              className="w-full flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3.5 text-left active:bg-zinc-800"
            >
              <span className="text-white text-sm">{ex.name}</span>
              <span className="text-zinc-500 text-xs">{ex.category}</span>
            </button>
          ))
        ) : (
          <p className="text-zinc-600 text-sm text-center py-8">No exercises found.</p>
        )}
      </div>
    </div>
  )
}
