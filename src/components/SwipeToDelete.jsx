import { useEffect, useId, useRef, useState } from 'react'

const ACTION_WIDTH = 88

// Swiping reveals an action; even a full swipe never deletes a record.
export default function SwipeToDelete({ children, label, onDelete, className = '', surfaceClassName = 'bg-zinc-950' }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const root = useRef(null)
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const action = useRef(null)
  const hintId = useId()
  const open = offset > 0

  // Only the revealed row listens globally. Starting elsewhere closes it.
  useEffect(() => {
    if (!open) return
    function outside(event) {
      if (!root.current?.contains(event.target)) setOffset(0)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open])

  function start(event) {
    if (!event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, initial: offset, axis: null }
  }

  function move(event) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (!g.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y'
      suppressClick.current = true
      if (g.axis === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
    }
    if (g.axis === 'x') {
      event.preventDefault()
      setOffset(Math.max(0, Math.min(ACTION_WIDTH, g.initial - dx)))
    }
  }

  function finish(event, cancelled = false) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (g.axis === 'x') {
      const distance = Math.max(0, Math.min(ACTION_WIDTH, g.initial + g.x - event.clientX))
      setOffset(cancelled ? g.initial : distance >= ACTION_WIDTH / 2 ? ACTION_WIDTH : 0)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div ref={root} className={`swipe-delete relative overflow-hidden ${className}`}>
      <span id={hintId} className="sr-only">Swipe left to show Delete. With a keyboard, press Delete or Arrow Left; Escape closes it.</span>

      <div data-swipe-content tabIndex={0} role="group" aria-label={label} aria-describedby={hintId}
        className={`relative ${surfaceClassName} focus-visible:outline-2 focus-visible:outline-accent-500`}
        style={{ transform: `translateX(-${offset}px)`, touchAction: 'pan-y', transition: dragging ? 'none' : undefined }}
        onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
        onClickCapture={event => {
          if (suppressClick.current || open) {
            event.preventDefault()
            event.stopPropagation()
            if (!suppressClick.current) setOffset(0)
            suppressClick.current = false
          }
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'Delete' || event.key === 'ArrowLeft') {
            event.preventDefault()
            setOffset(ACTION_WIDTH)
          } else if (event.key === 'Escape' || event.key === 'ArrowRight') setOffset(0)
        }}>
        {children}
        <button type="button" className="sr-only focus:not-sr-only focus:min-h-11 focus:px-3" onClick={() => setOffset(ACTION_WIDTH)}>
          Show delete for {label}
        </button>
      </div>
      <button ref={action} type="button" aria-label={`Delete ${label}`} hidden={!open}
        className="absolute inset-y-0 right-0 w-[88px] min-h-11 bg-red-500 text-zinc-950 text-sm font-semibold"
        onKeyDown={event => { if (event.key === 'Escape') { setOffset(0); root.current.querySelector('[data-swipe-content]').focus() } }}
        onClick={() => { setOffset(0); onDelete() }}>Delete</button>
    </div>
  )
}
