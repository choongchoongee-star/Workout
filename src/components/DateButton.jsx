import { formatDate } from '../lib/dateUtils'

// Keep the native input interactive while sharing its visible face across platforms.
export default function DateButton({ value, onChange, max, label, className = '' }) {
  return (
    <label className={`date-button relative inline-flex min-h-11 max-w-full items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-base font-semibold text-zinc-300 focus-within:ring-2 focus-within:ring-accent-500 ${className}`}>
      <span aria-hidden="true">
        {value ? formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' }) : label}
      </span>
      <input
        type="date"
        aria-label={label}
        value={value}
        max={max}
        onChange={onChange}
        className="absolute inset-0 h-full w-full min-w-0 cursor-pointer opacity-0"
      />
    </label>
  )
}
