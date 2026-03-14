import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/exercises'

const TYPE_LABELS = { weight: '웨이트', bodyweight: '맨몸', cardio: '유산소' }

export default function Library() {
  const { exercises, addExercise, deleteExercise } = useApp()
  const [activeCategory, setActiveCategory] = useState('전체')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: '가슴', type: 'weight', met: '' })

  const categories = ['전체', ...CATEGORIES]
  const filtered = exercises.filter(e => {
    const matchCat = activeCategory === '전체' || e.category === activeCategory
    const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  function handleAdd() {
    if (!form.name.trim()) return
    const id = `custom-${Date.now()}`
    addExercise({
      id,
      name: form.name.trim(),
      category: form.category,
      type: form.type,
      met: form.type === 'cardio' && form.met ? parseFloat(form.met) : undefined,
    })
    setForm({ name: '', category: '가슴', type: 'weight', met: '' })
    setShowAdd(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold text-white">운동 목록</h1>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-xl active:bg-blue-700"
        >
          + 추가
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-4 space-y-3">
          <h3 className="text-white font-medium">새 운동 추가</h3>
          <input
            type="text"
            placeholder="운동 이름"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-zinc-500 text-xs block mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-zinc-500 text-xs block mb-1">타입</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              >
                <option value="weight">웨이트</option>
                <option value="bodyweight">맨몸</option>
                <option value="cardio">유산소</option>
              </select>
            </div>
          </div>
          {form.type === 'cardio' && (
            <div>
              <label className="text-zinc-500 text-xs block mb-1">MET 값 (칼로리 계산용)</label>
              <input
                type="number"
                step="0.1"
                placeholder="예: 8.3"
                value={form.met}
                onChange={e => setForm(f => ({ ...f, met: e.target.value }))}
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm active:bg-zinc-700"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm active:bg-blue-700"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="운동 검색..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
      />

      {/* Category tabs */}
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

      {/* Exercise list */}
      <div className="space-y-1">
        {filtered.map(ex => (
          <div key={ex.id} className="flex items-center bg-zinc-900 rounded-xl px-4 py-3">
            <div className="flex-1">
              <span className="text-white text-sm">{ex.name}</span>
              <span className="text-zinc-600 text-xs ml-2">{TYPE_LABELS[ex.type]}</span>
            </div>
            <span className="text-zinc-600 text-xs mr-3">{ex.category}</span>
            {ex.id.startsWith('custom-') && (
              <button
                onClick={() => deleteExercise(ex.id)}
                className="text-zinc-700 active:text-red-400 text-lg px-1"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">검색 결과 없음</p>
        )}
      </div>
    </div>
  )
}
