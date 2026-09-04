import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV = [
  {
    to: '/session',
    label: 'Workout',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M6.5 6.5h11M6.5 17.5h11M3 9h2v6H3zM19 9h2v6h-2z" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/weight',
    label: 'Progress',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function Layout({ children }) {
  const mainRef = useRef(null)
  const scrollPositions = useRef({})
  const { pathname } = useLocation()
  const { recoveryNotice, dismissRecoveryNotice } = useApp()

  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    if (pathname === '/session' && scrollPositions.current[pathname] != null) {
      main.scrollTo(0, scrollPositions.current[pathname])
    } else {
      main.scrollTo(0, 0)
    }

    if (pathname !== '/session') return
    const handler = () => { scrollPositions.current[pathname] = main.scrollTop }
    main.addEventListener('scroll', handler, { passive: true })
    return () => main.removeEventListener('scroll', handler)
  }, [pathname])

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {recoveryNotice && (
          <div role="status" className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
            <p className="flex-1">{recoveryNotice}</p>
            <button type="button" onClick={dismissRecoveryNotice} aria-label="Dismiss recovery message" className="text-amber-400">×</button>
          </div>
        )}
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                isActive ? 'text-blue-400' : 'text-zinc-500'
              }`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
