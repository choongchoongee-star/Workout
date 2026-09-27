import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/i18n'

export default function HistoryScrollbar({ scrollRef }) {
  const trackRef = useRef(null)
  const dragRef = useRef(null)
  const [metrics, setMetrics] = useState({ top: 0, max: 0, viewport: 0, track: 0 })

  useEffect(() => {
    const main = scrollRef.current
    const track = trackRef.current
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setMetrics({
        top: main.scrollTop,
        max: Math.max(0, main.scrollHeight - main.clientHeight),
        viewport: main.clientHeight,
        track: track.clientHeight,
      }))
    }
    const resize = new ResizeObserver(update)
    resize.observe(main)
    resize.observe(track)
    const observeContent = () => {
      resize.disconnect()
      resize.observe(main)
      resize.observe(track)
      for (const child of main.children) resize.observe(child)
      update()
    }
    const mutations = new MutationObserver(observeContent)
    mutations.observe(main, { childList: true, subtree: true, characterData: true })
    main.addEventListener('scroll', update, { passive: true })
    observeContent()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      main.removeEventListener('scroll', update)
    }
  }, [scrollRef])

  const height = Math.min(metrics.track, Math.max(28, metrics.track * metrics.viewport / (metrics.viewport + metrics.max || 1)))
  const travel = metrics.track - height
  const offset = metrics.max ? Math.max(0, Math.min(travel, metrics.top / metrics.max * travel)) : 0

  function move(clientY, grabOffset) {
    if (travel <= 0) return
    const position = clientY - trackRef.current.getBoundingClientRect().top - grabOffset
    scrollRef.current.scrollTop = Math.max(0, Math.min(1, position / travel)) * metrics.max
  }

  return (
    <div ref={trackRef} className="history-scrollbar" style={{ visibility: metrics.max > 0 ? 'visible' : 'hidden' }}
      role="scrollbar" tabIndex={metrics.max > 0 ? 0 : -1} aria-label={t('Workout history')}
      aria-controls="app-scroll-content" aria-orientation="vertical"
      aria-valuemin={0} aria-valuemax={Math.ceil(metrics.max)} aria-valuenow={Math.round(Math.max(0, Math.min(metrics.max, metrics.top)))}
      onPointerDown={e => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.focus()
        e.currentTarget.setPointerCapture(e.pointerId)
        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
        dragRef.current = y >= offset && y <= offset + height ? y - offset : height / 2
        move(e.clientY, dragRef.current)
      }}
      onPointerMove={e => { if (dragRef.current !== null) move(e.clientY, dragRef.current) }}
      onPointerUp={() => { dragRef.current = null }}
      onPointerCancel={() => { dragRef.current = null }}
      onLostPointerCapture={() => { dragRef.current = null }}
      onKeyDown={e => {
        const main = scrollRef.current
        const targets = { ArrowDown: main.scrollTop + 40, ArrowUp: main.scrollTop - 40,
          PageDown: main.scrollTop + metrics.viewport, PageUp: main.scrollTop - metrics.viewport,
          Home: 0, End: metrics.max }
        if (e.key in targets) { e.preventDefault(); main.scrollTop = targets[e.key] }
      }}>
      <div className="history-scrollbar-track" />
      <div className="history-scrollbar-thumb" style={{ height, transform: `translateY(${offset}px)` }} />
    </div>
  )
}
