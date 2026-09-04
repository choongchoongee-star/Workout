import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/exercises'
import { isDefaultExercise } from '../lib/exerciseLibrary'

const TYPE_LABELS = { weight: 'Weight', bodyweight: 'Bodyweight', cardio: 'Cardio' }

export default function Library() {
  const { exercises, addExercise, deleteExercise, loaded, syncError } = useApp()
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Chest', type: 'weight', met: '' })

  const categories = ['All', ...CATEGORIES]
  const filtered = exercises
    .filter(e => {
      const matchCat = activeCategory === 'All' || e.category === activeCategory
      const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQ
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))

  function handleAdd() {
    if (!form.name.trim()) return
    const metValue = parseFloat(form.met)
    const id = `custom-${crypto.randomUUID()}`
    addExercise({
      id,
      name: form.name.trim(),
      category: form.category,
      type: form.type,
      met: form.type === 'cardio' && isFinite(metValue) && metValue > 0 ? metValue : null,
    })
    setForm({ name: '', category: 'Chest', type: 'weight', met: '' })
    setShowAdd(false)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold text-white">Exercises</h1>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-xl active:bg-blue-700"
        >
          + Add
        </button>
      </div>

      {/* Local file save error warning */}
      {syncError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-4 text-sm text-red-300">
          Could not save your exercise library on this device.
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-zinc-900 rounded-2xl p-4 mb-4 space-y-3">
          <h3 className="text-white font-medium">Add custom exercise</h3>
          <input
            type="text"
            placeholder="Exercise name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-zinc-500 text-xs block mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-zinc-500 text-xs block mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              >
                <option value="weight">Weight</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="cardio">Cardio</option>
              </select>
            </div>
          </div>
          {form.type === 'cardio' && (
            <div>
              <label className="text-zinc-500 text-xs block mb-1">MET value (for calorie estimates)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 8.3"
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
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm active:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search exercises..."
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
        {!loaded && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {loaded && filtered.map(ex => {
          const isCustom = ex.id.startsWith('custom-') && !isDefaultExercise(ex)
          return (
            <div
              key={ex.id}
              className={`flex items-center rounded-xl px-4 py-3 ${
                isCustom ? 'bg-blue-950/50 border border-blue-800/50' : 'bg-zinc-900'
              }`}
            >
              <div className="flex-1">
                <span className="text-white text-sm">{ex.name}</span>
                {isCustom && <span className="text-blue-400 text-xs ml-2">Custom</span>}
                <span className="text-zinc-600 text-xs ml-2">{TYPE_LABELS[ex.type]}</span>
              </div>
              <span className="text-zinc-600 text-xs mr-3">{ex.category}</span>
              {isCustom && (
                <button
                  onClick={() => deleteExercise(ex.id)}
                  className="text-zinc-700 active:text-red-400 text-lg px-1"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        {loaded && filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">No exercises found.</p>
        )}
      </div>
    </div>
  )
}
