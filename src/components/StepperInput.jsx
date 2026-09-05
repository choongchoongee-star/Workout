import { useRef, useEffect, useState } from 'react'

function NumberEditor({ value, onChange, step, unit, min, label, contextLabel, onClose }) {
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  const [draft, setDraft] = useState(String(value))
  const number = draft.trim() === '' ? NaN : Number(draft)
  const valid = Number.isFinite(number) && number >= min

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    headingRef.current.focus()
    return () => dialog.close()
  }, [])

  function adjust(direction) {
    setDraft(String(Math.max(min, Number(((valid ? number : value) + direction * step).toFixed(2)))))
  }

  return (
    <dialog ref={dialogRef} aria-label={`${contextLabel} ${label}`}
      onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-white backdrop:bg-black/70">
      <form onSubmit={e => { e.preventDefault(); if (valid) { onChange(number); onClose() } }}>
        <p className="text-sm text-zinc-400">{contextLabel}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">{label}</h2>
        <p className="mt-2 text-sm text-zinc-300">Use − / +, or tap the number to type.</p>
        <div className="my-5 grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-3">
          <button type="button" aria-label={`Decrease ${unit} by ${step}`} onClick={() => adjust(-1)}
            className="h-14 rounded-lg border border-zinc-600 text-2xl active:bg-zinc-800">−</button>
          <div className="min-w-0 text-center">
            <input type="number" inputMode="decimal" step="any" min={min} aria-label={unit} value={draft}
              onFocus={e => e.currentTarget.select()} onChange={e => setDraft(e.target.value)}
              className="h-14 w-full min-w-0 border-b-2 border-accent-400 bg-transparent px-0 text-center text-3xl font-semibold tabular-nums focus:outline-none" />
            <span className="text-sm text-zinc-300">{unit}</span>
          </div>
          <button type="button" aria-label={`Increase ${unit} by ${step}`} onClick={() => adjust(1)}
            className="h-14 rounded-lg border border-zinc-600 text-2xl active:bg-zinc-800">+</button>
        </div>
        {!valid && <p role="alert" className="mb-3 text-sm text-red-300">Enter a number of {min} or more.</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="min-h-12 rounded-lg border border-zinc-600 text-base active:bg-zinc-800">Cancel</button>
          <button type="submit" disabled={!valid} className="min-h-12 rounded-lg bg-accent-600 text-base font-semibold text-zinc-950 active:bg-accent-700 disabled:opacity-40">Apply</button>
        </div>
      </form>
    </dialog>
  )
}

export default function StepperInput({ value, onChange, step = 1, unit = '', min = 0, disabled = false, contextLabel = '', label = unit === 'reps' ? 'Reps' : 'Weight' }) {
  const [editing, setEditing] = useState(false)
  return (
    <>
      <div className="grid w-full max-w-28 min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center justify-self-center">
        <button type="button" disabled={disabled} aria-label={`Decrease ${unit} by ${step}`}
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
          className="row-start-2 col-start-1 h-11 rounded-md text-2xl text-zinc-300 active:bg-zinc-800 active:text-white disabled:text-zinc-600">−</button>
        <button type="button" disabled={disabled} onClick={() => setEditing(true)}
          aria-label={`Edit ${label.toLowerCase()}: ${value} ${unit}`} aria-haspopup="dialog"
          className="col-span-3 col-start-1 row-start-1 h-8 w-full min-w-0 text-center text-2xl font-medium tabular-nums text-white underline decoration-zinc-700 underline-offset-4 active:bg-zinc-800 disabled:no-underline disabled:text-zinc-300">
          {value}
        </button>
        <button type="button" disabled={disabled} aria-label={`Increase ${unit} by ${step}`}
          onClick={() => onChange(Number((value + step).toFixed(2)))}
          className="row-start-2 col-start-3 h-11 rounded-md text-2xl text-zinc-300 active:bg-zinc-800 active:text-white disabled:text-zinc-600">+</button>
      </div>
      {editing && <NumberEditor value={value} onChange={onChange} step={step} unit={unit} min={min}
        label={label} contextLabel={contextLabel} onClose={() => setEditing(false)} />}
    </>
  )
}
