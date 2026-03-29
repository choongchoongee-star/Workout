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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onPointerDown={dec}
        disabled={disabled}
        className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium active:bg-zinc-700 select-none disabled:opacity-40 disabled:pointer-events-none"
      >
        -{step}
      </button>

      <div className="flex items-baseline gap-0.5 min-w-[4rem] justify-center">
        <input
          ref={inputRef}
          type="number"
          defaultValue={value}
          disabled={disabled}
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
          className="w-14 text-center bg-transparent text-white text-lg font-semibold focus:outline-none disabled:opacity-40"
        />
        {unit && <span className="text-zinc-400 text-sm">{unit}</span>}
      </div>

      <button
        type="button"
        onPointerDown={inc}
        disabled={disabled}
        className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium active:bg-zinc-700 select-none disabled:opacity-40 disabled:pointer-events-none"
      >
        +{step}
      </button>
    </div>
  )
}
