import { getLanguage, t } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyTheme } from '../lib/theme'
import { storage } from '../lib/storage'
import { useApp } from '../context/AppContext'
import { buildMarkdown, exportFilename } from '../lib/exportUtils'
import { exportWorkoutFile } from '../lib/workoutFileExport'
import { MAX_IMPORT_BYTES, parseWorkoutMarkdown, planWorkoutImport } from '../lib/importUtils'
import { getRestNotificationPermission, requestRestNotificationPermission } from '../lib/restNotification'
import { openAppSettings } from '../lib/appSettings'
import { otaUpdater } from '../lib/otaUpdate'

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="text-zinc-300 text-sm font-medium block mb-1">{t(label)}</label>
      {hint && <p className="text-zinc-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  )
}

export default function Settings() {
  const { sessions, exercises, importWorkoutData, syncing, syncError, retrySave } = useApp()
  const [restSeconds, setRestSeconds] = useState(String(storage.getRestSeconds()))
  const [theme, setTheme] = useState(storage.getTheme)
  const [weightUnit, setWeightUnit] = useState(storage.getWeightUnit)
  const [status, setStatus] = useState({})
  const [importFile, setImportFile] = useState(null)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState('')
  const [reading, setReading] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('checking')
  const [settingsError, setSettingsError] = useState('')
  const [updateStatus, setUpdateStatus] = useState('')
  const fileInputRef = useRef(null)
  const importPlan = importFile ? planWorkoutImport({ sessions, exercises }, importFile.data) : null

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const permission = await getRestNotificationPermission()
      if (!cancelled) {
        setNotificationPermission(permission)
        setSettingsError('')
      }
    }
    void refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  async function enableRestAlerts() {
    setSettingsError('')
    setNotificationPermission('checking')
    setNotificationPermission(await requestRestNotificationPermission())
  }

  async function handleOpenAppSettings() {
    setSettingsError('')
    if (!await openAppSettings()) {
      setSettingsError(t("Could not open iPhone Settings. Open Settings → Apps → Steady Sets → Notifications."))
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // Allow selecting the same file again after cancel/error.
    if (!file) return
    setImportFile(null)
    setImportError('')
    setImportResult('')
    setReading(true)
    try {
      if (!/\.md$/i.test(file.name)) throw new Error(t("Choose a .md file."))
      if (file.size > MAX_IMPORT_BYTES) throw new Error(t("Choose a file smaller than 10 MB."))
      const data = parseWorkoutMarkdown(await file.text(), exercises)
      if (!data.sessions.length) throw new Error(t("There are no workouts to import."))
      setImportFile({ name: file.name, data })
    } catch (error) {
      const message = error.message || 'Could not read the file. Please select it again.'
      const translated = t(message)
      setImportError(getLanguage() === 'ko' && translated === message && /[a-z]/i.test(message)
        ? t('Could not import this backup. Select an original workout .md file exported by this app.')
        : translated)
    } finally {
      setReading(false)
    }
  }

  function handleConfirmImport() {
    if (!importFile) return
    const result = importWorkoutData(importFile.data)
    setImportResult(t('Sessions added: {added}. Existing dates skipped: {skipped}.', { added: result.addedCount, skipped: result.skippedCount }))
    setImportFile(null)
  }

  async function handleExport() {
    if (!sessions?.length) {
      setStatus({ msg: t("There are no workouts to export."), ok: false })
      setTimeout(() => setStatus({}), 2000)
      return
    }
    try {
      await exportWorkoutFile(buildMarkdown(sessions, exercises), exportFilename('md'))
      setStatus({ msg: t("Export complete ✓"), ok: true })
      setTimeout(() => setStatus({}), 2000)
    } catch {
      setStatus({ msg: t("Export failed."), ok: false })
      setTimeout(() => setStatus({}), 2000)
    }
  }

  function save() {
    const rs = parseInt(restSeconds, 10)
    if (!isNaN(rs) && rs >= 0) storage.setRestSeconds(rs)
    storage.setWeightUnit(weightUnit)
    setStatus({ msg: t("Saved ✓"), ok: true, scope: 'preferences' })
    setTimeout(() => setStatus({}), 2000)
  }

  const inputCls = "w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 placeholder-zinc-500"

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h1 className="text-xl font-bold text-white mb-6 pt-2">{t("Settings")}</h1>

      {/* Body settings */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-4">{t("Preferences")}</h2>
        <Field label={t("Appearance")} hint={t("Applies immediately and is saved on this device.")}>
          <div role="group" aria-label={t("Appearance")} className="flex gap-2">
            {['light', 'dark'].map(value => (
              <button key={value} type="button" aria-pressed={theme === value}
                onClick={() => { setTheme(value); storage.setTheme(value); applyTheme(value) }}
                className={`flex-1 min-h-11 rounded-lg text-sm font-medium ${theme === value ? 'bg-accent-600 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                {value === 'dark' ? t("Dark") : t("Light")}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("Weight unit")} hint={t("Used for workout entry and history. Existing weights are converted.")}>
          <div role="group" aria-label={t("Weight unit")} className="flex gap-2">
            {['kg', 'lbs'].map(unit => (
              <button key={unit} type="button" aria-pressed={weightUnit === unit}
                onClick={() => setWeightUnit(unit)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${weightUnit === unit ? 'bg-accent-600 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                {unit}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("Rest timer (seconds)")} hint={t("Set to 0 to disable the rest timer.")}>
          <input
            type="number"
            min="0"
            aria-label={t("Rest timer seconds")}
            onFocus={() => setRestSeconds('')}
            value={restSeconds}
            onChange={e => setRestSeconds(e.target.value)}
            className={inputCls}
            placeholder="90"
          />
        </Field>
        <div className="border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-zinc-300 text-sm font-medium">{t("Rest timer alerts")}</p>
              <p className="text-zinc-600 text-xs mt-1">{t("Alerts at the end of a rest period, including while the app is in the background.")}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
              notificationPermission === 'granted'
                ? 'bg-green-900/40 text-green-300'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {notificationPermission === 'granted' ? t("Enabled") : notificationPermission === 'checking' ? t("Checking…") : notificationPermission === 'web' ? t("iPhone only") : t("Disabled")}
            </span>
          </div>
          {(notificationPermission === 'prompt' || notificationPermission === 'prompt-with-rationale') && (
            <button type="button" onClick={enableRestAlerts} className="mt-3 w-full rounded-xl bg-zinc-800 py-2.5 text-sm text-zinc-200 active:bg-zinc-700">{t("Enable alerts")}</button>
          )}
          {notificationPermission === 'denied' && (
            <div className="mt-3">
              <p className="text-xs text-amber-300">{t("Notifications are blocked. Enable them in iPhone Settings to receive rest alerts.")}</p>
              <button type="button" onClick={handleOpenAppSettings} className="mt-3 w-full rounded-xl bg-zinc-800 py-2.5 text-sm text-zinc-200 active:bg-zinc-700">{t("Open iPhone Settings")}</button>
            </div>
          )}
          {settingsError && <p role="alert" className="mt-3 text-xs text-red-300">{settingsError}</p>}
          {notificationPermission === 'unavailable' && (
            <p className="mt-3 text-xs text-red-300">{t("Notification status could not be checked. Try reopening Settings.")}</p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          <span role="status" className="text-sm text-green-300">
            {status.scope === 'preferences' ? status.msg : ''}
          </span>
          <button
            type="button"
            onClick={save}
            className="min-h-11 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-zinc-950 active:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >{t("Save preferences")}</button>
        </div>
      </div>

      {/* Data backup */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-1">{t("Backup / Restore")}</h2>
        <p className="text-zinc-600 text-xs mb-3">
          {t('Download all {count} workout sessions as a Markdown file.', { count: sessions.length })}
        </p>
        <button
          onClick={handleExport}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-700"
        >{t("Export workouts (.md)")}</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          aria-label={t("Markdown file to import")}
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={reading}
          className="w-full mt-2 bg-zinc-800 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-700 disabled:opacity-50"
        >
          {reading ? t("Reading file…") : t("Import workouts (.md)")}
        </button>
        <p className="text-zinc-400 text-xs mt-3">{t("Existing workouts are kept. Only missing dates are added and saved on this device automatically.")}</p>
        {importFile && (
          <div className="mt-4 border border-zinc-700 rounded-xl p-3 space-y-3" aria-label={t("Import preview")}>
            <p className="text-zinc-200 text-sm break-all">{importFile.name}</p>
            <p className="text-zinc-300 text-sm">
              {t('Sessions to add: {added} · Dates to skip: {skipped} · New exercises: {exercises}', { added: importPlan.addedCount, skipped: importPlan.skippedCount, exercises: importPlan.exerciseCount })}
            </p>
            {importFile.data.warnings.map(warning => (
              <p key={t(warning)} className="text-amber-300 text-xs">{warning}</p>
            ))}
            {importPlan.addedCount === 0 && <p className="text-zinc-400 text-sm">{t("Every date already has a workout. There is nothing to add.")}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setImportFile(null)} className="flex-1 bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm">{t("Cancel")}</button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!importPlan.addedCount}
                className="flex-1 bg-accent-600 text-zinc-950 rounded-xl py-2.5 text-sm disabled:opacity-50"
              >{t("Import")}</button>
            </div>
          </div>
        )}
        {importError && <p role="alert" className="mt-3 text-red-300 text-sm">{importError}</p>}
        {importResult && <p role="status" className="mt-3 text-green-300 text-sm">{importResult}</p>}
        {syncing && <p role="status" className="mt-3 text-zinc-400 text-xs">{t("Saving on this device…")}</p>}
        {syncError && (
          <div role="alert" className="mt-3 text-red-300 text-sm">
            <p>{t("Could not save on this device. Please retry before closing this screen.")}</p>
            <button type="button" onClick={retrySave} disabled={syncing} className="mt-2 underline disabled:opacity-50">{t("Retry save")}</button>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">{t("App updates")}</h2>
        <p className="text-zinc-400 text-xs mb-3">{t("Updates are downloaded in the background and applied the next time the app starts. Your workouts stay on this device.")}</p>
        <button type="button" disabled={updateStatus === 'checking'} onClick={async () => {
          setUpdateStatus('checking')
          setUpdateStatus(await otaUpdater.check())
        }} className="w-full rounded-xl bg-zinc-800 py-2.5 text-sm text-zinc-200 disabled:opacity-50">{t("Check for updates")}</button>
        {updateStatus && <p role="status" className="mt-3 text-xs text-zinc-300">{{
          checking: t("Checking for updates…"), current: t("No new update is available."),
          pending: t("Update ready. It will apply after you fully close and reopen the app."),
          blocked: t("This update could not start safely. Your current version is kept."),
          unavailable: t("Could not check for updates. You can keep using the app offline."),
          web: t("Updates are available in the iPhone app."),
        }[updateStatus]}</p>}
      </div>

      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">{t("Privacy")}</h2>
        <p className="text-zinc-600 text-xs mb-3">{t("Workout data stays on this device and is not sent to the developer.")}</p>
        <Link to="/privacy" className="flex items-center justify-between text-sm text-zinc-300 active:text-white">
          <span>{t("Privacy Policy")}</span>
          <span className="text-zinc-500">→</span>
        </Link>
      </div>

      {/* Status message */}
      {status.msg && status.scope !== 'preferences' && (
        <div className={`rounded-xl p-3 mb-4 text-sm text-center ${
          status.ok === true ? 'bg-green-900/30 text-green-300 border border-green-800' :
          status.ok === false ? 'bg-red-900/30 text-red-300 border border-red-800' :
          'bg-zinc-800 text-zinc-400'
        }`}>
          {status.msg}
        </div>
      )}

    </div>
  )
}
