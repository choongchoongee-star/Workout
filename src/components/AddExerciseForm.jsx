import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/exercises'

export default function AddExerciseForm({ onCancel, onAdded }) {
  const { addExercise } = useApp()
  const [form, setForm] = useState({ name: '', category: 'Chest', type: 'weight', met: '' })

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
    onAdded()
  }

  return (
    <form onSubmit={event => { event.preventDefault(); handleAdd() }} className="bg-zinc-900 rounded-2xl p-4 mb-4 space-y-3" aria-label="Add custom exercise">
      <h3 className="text-white font-medium">Add custom exercise</h3>
      <input
        type="text"
        aria-label="Exercise name"
        autoFocus
        required
        placeholder="Exercise name"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-zinc-500 text-xs block mb-1">Category</label>
          <select
            aria-label="Category"
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
            aria-label="Type"
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
            aria-label="MET value"
            min="0.1"
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
          type="button"
          onClick={onCancel}
          className="flex-1 bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm active:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.name.trim()}
          className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm active:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  )
}
