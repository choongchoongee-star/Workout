import { useState } from 'react'
import AddExerciseForm from '../components/AddExerciseForm'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/exercises'
import { isDefaultExercise } from '../lib/exerciseLibrary'

const TYPE_LABELS = { weight: 'Weight', bodyweight: 'Bodyweight', cardio: 'Cardio' }

export default function Library() {
  const { exercises, deleteExercise, loaded, syncError } = useApp()
  const [activeCategory, setActiveCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const categories = ['All', ...CATEGORIES]
  const filtered = exercises
    .filter(e => {
      const matchCat = activeCategory === 'All' || e.category === activeCategory
      const matchQ = !query || e.name.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQ
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))


  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="text-xl font-bold text-white">Exercises</h1>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-accent-600 text-zinc-950 text-sm px-3 py-1.5 rounded-xl active:bg-accent-700"
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

      {showAdd && <AddExerciseForm onCancel={() => setShowAdd(false)} onAdded={() => setShowAdd(false)} />}

      {/* Search */}
      <input
        type="text"
        placeholder="Search exercises..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-zinc-900 text-white rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder-zinc-500"
      />

      {/* Category tabs */}
      <div className="category-filters mb-4">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            aria-pressed={activeCategory === c}
            className={`min-h-11 min-w-0 text-sm px-1 py-2 rounded-lg transition-colors [overflow-wrap:anywhere] ${
              activeCategory === c ? 'bg-accent-600 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
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
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {loaded && filtered.map(ex => {
          const isCustom = ex.id.startsWith('custom-') && !isDefaultExercise(ex)
          return (
            <div
              key={ex.id}
              className={`flex items-center rounded-xl px-4 py-3 ${
                isCustom ? 'bg-accent-950/50 border border-accent-800/50' : 'bg-zinc-900'
              }`}
            >
              <div className="flex-1">
                <span className="text-white text-sm">{ex.name}</span>
                {isCustom && <span className="text-accent-400 text-xs ml-2">Custom</span>}
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
