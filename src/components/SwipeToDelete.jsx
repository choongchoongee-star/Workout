import { useCallback, useEffect, useId, useRef, useState } from 'react'

const ACTION_WIDTH = 88

// Swiping reveals an action; even a full swipe never deletes a record.
export default function SwipeToDelete({ children, label, onDelete, className = '', surfaceClassName = 'bg-zinc-950' }) {
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const root = useRef(null)
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const content = useRef(null)
  const position = useRef(0)
  const frame = useRef(null)
  const hintId = useId()
  // Transient pointer positions do not belong in React render state.
  const paint = useCallback((value) => {
    position.current = value
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (content.current) content.current.style.transform = `translate3d(-${position.current}px, 0, 0)`
    })
  }, [])

  const settle = useCallback((value) => {
    if (content.current) content.current.dataset.dragging = 'false'
    setDragging(false)
    setOpen(value > 0)
    paint(value)
  }, [paint])

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  // Only the revealed row listens globally. Starting elsewhere closes it.
  useEffect(() => {
    if (!open) return
    function outside(event) {
      if (!root.current?.contains(event.target)) settle(0)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open, settle])

  function start(event) {
    if (!event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, initial: Math.max(0, -new DOMMatrixReadOnly(getComputedStyle(content.current).transform).m41), axis: null }
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
        content.current.dataset.dragging = 'true'
        setDragging(true)
      }
    }
    if (g.axis === 'x') {
      event.preventDefault()
      paint(Math.max(0, Math.min(ACTION_WIDTH, g.initial - dx)))
    }
  }

  function finish(event, cancelled = false) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (g.axis === 'x') {
      const distance = Math.max(0, Math.min(ACTION_WIDTH, g.initial + g.x - event.clientX))
      settle(cancelled ? g.initial : distance >= ACTION_WIDTH / 2 ? ACTION_WIDTH : 0)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div ref={root} className={`swipe-delete relative overflow-hidden ${className}`}>
      <span id={hintId} className="sr-only">Swipe left to show Delete. With a keyboard, press Delete or Arrow Left; Escape closes it.</span>

      <div ref={content} data-swipe-content tabIndex={0} role="group" aria-label={label} aria-describedby={hintId}
        className={`relative z-10 ${surfaceClassName} focus-visible:outline-2 focus-visible:outline-accent-500`}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
        onClickCapture={event => {
          if (suppressClick.current || open) {
            event.preventDefault()
            event.stopPropagation()
            if (!suppressClick.current) settle(0)
            suppressClick.current = false
          }
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'Delete' || event.key === 'ArrowLeft') {
            event.preventDefault()
            settle(ACTION_WIDTH)
          } else if (event.key === 'Escape' || event.key === 'ArrowRight') settle(0)
        }}>
        {children}
        <button type="button" className="sr-only focus:not-sr-only focus:min-h-11 focus:px-3" onClick={() => settle(ACTION_WIDTH)}>
          Show delete for {label}
        </button>
      </div>
      <button type="button" aria-label={`Delete ${label}`} aria-hidden={!open || dragging} tabIndex={open && !dragging ? 0 : -1} disabled={!open || dragging}
        className="absolute inset-y-0 right-0 w-[88px] min-h-11 bg-red-500 text-zinc-950 text-sm font-semibold"
        onKeyDown={event => { if (event.key === 'Escape') { settle(0); root.current.querySelector('[data-swipe-content]').focus() } }}
        onClick={() => { settle(0); onDelete() }}>Delete</button>
    </div>
  )
}
