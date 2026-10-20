import { t } from '../lib/i18n'

export default function RestTimer({ seconds, onSkip }) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div role="region" aria-label={t('Rest timer')} className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 mx-4 flex min-h-14 items-center gap-2.5 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-1 shadow-xl z-40">
      <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="13" r="8" />
        <path d="M9 2h6m-3 3V2m0 6v5l3 2" />
      </svg>
      <span className="text-sm text-zinc-400">{t('Rest')}</span>
      <span role="timer" className="text-lg font-bold tabular-nums text-white">{mins}:{String(secs).padStart(2, '0')}</span>
      <button type="button" onClick={onSkip} className="ml-auto min-h-11 shrink-0 px-2 text-sm text-zinc-400 active:text-white">
        {t('Skip')}
      </button>
    </div>
  )
}
