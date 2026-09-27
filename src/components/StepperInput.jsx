import { t } from '../lib/i18n'
import { useState } from 'react'

export default function StepperInput({ value, onChange, step = 1, unit = '', min = 0, disabled = false, contextLabel = '', label = unit === 'reps' ? t("Reps") : 'Weight' }) {
  const [draft, setDraft] = useState(null)

  function updateDraft(text) {
    setDraft(text)
    const number = text.trim() === '' ? NaN : Number(text)
    if (Number.isFinite(number) && number >= min) onChange(number)
  }

  return (
    <div className="grid w-full max-w-28 min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center justify-self-center">
      <button type="button" disabled={disabled} aria-label={t('Decrease {unit} by {step}', { unit: t(unit), step })}
        onClick={() => { setDraft(null); onChange(Math.max(min, Number((value - step).toFixed(2)))) }}
        className="row-start-2 col-start-1 h-11 rounded-md text-2xl text-zinc-300 active:bg-zinc-800 active:text-white disabled:text-zinc-600">−</button>
      <input type="number" inputMode={unit === 'reps' ? 'numeric' : 'decimal'} step="any" min={min} disabled={disabled}
        aria-label={`${contextLabel} ${t(label)} (${t(unit)})`}
        value={disabled ? value : draft ?? value}
        onFocus={e => e.currentTarget.select()}
        onChange={e => updateDraft(e.target.value)}
        onBlur={() => setDraft(null)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur() } }}
        className="col-span-3 col-start-1 row-start-1 h-8 w-full min-w-0 rounded-none border-0 border-b border-zinc-700 bg-transparent p-0 text-center text-2xl font-medium tabular-nums text-white focus:border-accent-400 focus:outline-none disabled:border-transparent disabled:text-zinc-300" />
      <button type="button" disabled={disabled} aria-label={t('Increase {unit} by {step}', { unit: t(unit), step })}
        onClick={() => { setDraft(null); onChange(Number((value + step).toFixed(2))) }}
        className="row-start-2 col-start-3 h-11 rounded-md text-2xl text-zinc-300 active:bg-zinc-800 active:text-white disabled:text-zinc-600">+</button>
    </div>
  )
}
