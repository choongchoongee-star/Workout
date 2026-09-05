import { useRef, useEffect } from 'react'

export default function StepperInput({ value, onChange, step = 1, unit = '', min = 0, disabled = false }) {
  const inputRef = useRef(null)

  // 외부에서 value가 바뀌면 input에 반영 (단, 사용자가 직접 입력 중일 때는 제외)
  useEffect(() => {
    const el = inputRef.current
    if (el && document.activeElement !== el) {
      el.value = String(value)
    }
  }, [value])

  function currentValue() {
    const parsed = parseFloat(inputRef.current?.value)
    return isNaN(parsed) ? value : parsed
  }

  function dec() {
    const next = Math.max(min, parseFloat((currentValue() - step).toFixed(2)))
    if (inputRef.current) inputRef.current.value = String(next)
    onChange(next)
  }

  function inc() {
    const next = parseFloat((currentValue() + step).toFixed(2))
    if (inputRef.current) inputRef.current.value = String(next)
    onChange(next)
  }

  return (
    <div className={`grid w-full min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center justify-self-center ${unit === 'reps' ? 'max-w-20' : 'max-w-25'}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        aria-label={`Decrease ${unit || 'value'} by ${step}`}
        title={`Decrease ${unit || 'value'} by ${step}`}
        className="h-8 text-zinc-500 text-base active:text-white active:bg-zinc-800 select-none disabled:opacity-30 disabled:pointer-events-none"
      >
        −
      </button>

      <div className="min-w-0">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="any"
          aria-label={unit || 'Value'}
          defaultValue={value}
          disabled={disabled}
          onFocus={e => e.currentTarget.select()}
          onClick={e => e.currentTarget.select()}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= min) onChange(v)
          }}
          onBlur={e => {
            const v = parseFloat(e.target.value)
            if (isNaN(v) || e.target.value === '' || v < min) {
              e.target.value = String(min)
              onChange(min)
            }
          }}
          className="w-full min-w-0 h-7 px-0 text-center bg-transparent text-white text-base tabular-nums focus:outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-accent-400/70 disabled:opacity-50"
        />
      </div>

      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        aria-label={`Increase ${unit || 'value'} by ${step}`}
        title={`Increase ${unit || 'value'} by ${step}`}
        className="h-8 text-zinc-500 text-base active:text-white active:bg-zinc-800 select-none disabled:opacity-30 disabled:pointer-events-none"
      >
        +
      </button>
    </div>
  )
}
