export default function StepperInput({ value, onChange, step = 1, unit = '', min = 0 }) {
  const dec = (amount) => {
    const next = Math.max(min, parseFloat((value - amount).toFixed(2)))
    onChange(next)
  }
  const inc = (amount) => {
    const next = parseFloat((value + amount).toFixed(2))
    onChange(next)
  }

  const steps = step === 1 ? [1] : [step, 1]

  return (
    <div className="flex items-center gap-1">
      {steps.slice().reverse().map(s => (
        <button
          key={`dec-${s}`}
          onPointerDown={() => dec(s)}
          className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium active:bg-zinc-700 select-none"
        >
          -{s < 1 ? s : s}
        </button>
      ))}

      <div className="flex items-baseline gap-0.5 min-w-[4rem] justify-center">
        <input
          type="number"
          value={value}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= min) onChange(v)
          }}
          className="w-14 text-center bg-transparent text-white text-lg font-semibold focus:outline-none"
        />
        {unit && <span className="text-zinc-400 text-sm">{unit}</span>}
      </div>

      {steps.map(s => (
        <button
          key={`inc-${s}`}
          onPointerDown={() => inc(s)}
          className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium active:bg-zinc-700 select-none"
        >
          +{s}
        </button>
      ))}
    </div>
  )
}
