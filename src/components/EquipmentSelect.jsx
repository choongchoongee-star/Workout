import { EQUIPMENT_LABELS } from '../lib/equipment'

export default function EquipmentSelect({ name, value, options, onChange }) {
  if (!options.length) return null
  return (
    <select aria-label={`Equipment for ${name}`} value={value ?? 'unspecified'}
      onChange={event => onChange(event.target.value)}
      className="min-h-11 max-w-[10rem] min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-400">
      {value === 'unspecified' && !options.includes('unspecified') && <option value="unspecified">Unspecified</option>}
      {options.map(option => <option key={option} value={option}>{EQUIPMENT_LABELS[option]}</option>)}
    </select>
  )
}
