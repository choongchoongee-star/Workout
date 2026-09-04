import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { buildMarkdown, downloadTextFile, exportFilename } from '../lib/exportUtils'
import { MAX_IMPORT_BYTES, parseWorkoutMarkdown, planWorkoutImport } from '../lib/importUtils'

function Field({ label, hint, children }) {
  return (
    <div className="mb-5">
      <label className="text-zinc-300 text-sm font-medium block mb-1">{label}</label>
      {hint && <p className="text-zinc-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const { sessions, exercises, importWorkoutData, syncing, syncError, retrySave } = useApp()
  const [restSeconds, setRestSeconds] = useState(String(storage.getRestSeconds()))
  const [status, setStatus] = useState({})
  const [importFile, setImportFile] = useState(null)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState('')
  const [reading, setReading] = useState(false)
  const fileInputRef = useRef(null)
  const importPlan = importFile ? planWorkoutImport({ sessions, exercises }, importFile.data) : null

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // Allow selecting the same file again after cancel/error.
    if (!file) return
    setImportFile(null)
    setImportError('')
    setImportResult('')
    setReading(true)
    try {
      if (!/\.md$/i.test(file.name)) throw new Error('Choose a .md file.')
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a file smaller than 10 MB.')
      const data = parseWorkoutMarkdown(await file.text(), exercises)
      if (!data.sessions.length) throw new Error('There are no workouts to import.')
      setImportFile({ name: file.name, data })
    } catch (error) {
      setImportError(error.message || 'Could not read the file. Please select it again.')
    } finally {
      setReading(false)
    }
  }

  function handleConfirmImport() {
    if (!importFile) return
    const result = importWorkoutData(importFile.data)
    setImportResult(`Sessions added: ${result.addedCount}. Existing dates skipped: ${result.skippedCount}.`)
    setImportFile(null)
  }

  function handleExport() {
    if (!sessions?.length) {
      setStatus({ msg: 'There are no workouts to export.', ok: false })
      setTimeout(() => setStatus({}), 2000)
      return
    }
    try {
      downloadTextFile(buildMarkdown(sessions, exercises), exportFilename('md'), 'text/markdown;charset=utf-8')
      setStatus({ msg: 'Export complete ✓', ok: true })
      setTimeout(() => setStatus({}), 2000)
    } catch {
      setStatus({ msg: 'Export failed.', ok: false })
      setTimeout(() => setStatus({}), 2000)
    }
  }

  function save() {
    const rs = parseInt(restSeconds, 10)
    if (!isNaN(rs) && rs >= 0) storage.setRestSeconds(rs)
    setStatus({ msg: 'Saved ✓', ok: true })
    setTimeout(() => setStatus({}), 2000)
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      setStatus({ msg: 'Sign-out failed. Please try again.', ok: false })
    }
  }

  const inputCls = "w-full bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"

  return (
    <div className="p-4 max-w-lg mx-auto pb-8">
      <h1 className="text-xl font-bold text-white mb-6 pt-2">Settings</h1>

      {/* Account */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">Account</h2>
        <div className="flex items-center gap-3 mb-4">
          {user?.photoURL && (
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <p className="text-white text-sm font-medium">{user?.displayName}</p>
            <p className="text-zinc-500 text-xs">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-zinc-700 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-600"
        >
          Sign out
        </button>
      </div>

      {/* Body settings */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-4">Preferences</h2>
        <Field label="Rest timer (seconds)" hint="Set to 0 to disable the rest timer.">
          <input
            type="number"
            min="0"
            value={restSeconds}
            onChange={e => setRestSeconds(e.target.value)}
            className={inputCls}
            placeholder="90"
          />
        </Field>
      </div>

      {/* Library link */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-3">Exercise library</h2>
        <Link
          to="/library"
          className="flex items-center justify-between text-sm text-zinc-300 active:text-white"
        >
          <span>Browse exercises / Add a custom exercise</span>
          <span className="text-zinc-500">→</span>
        </Link>
      </div>

      {/* Data backup */}
      <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
        <h2 className="text-zinc-300 font-medium mb-1">Backup / Restore</h2>
        <p className="text-zinc-600 text-xs mb-3">
          Download all {sessions.length} workout sessions as a Markdown file.
        </p>
        <button
          onClick={handleExport}
          className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-700"
        >
          Export workouts (.md)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          aria-label="Markdown file to import"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={reading}
          className="w-full mt-2 bg-zinc-800 text-zinc-200 text-sm rounded-xl py-2.5 active:bg-zinc-700 disabled:opacity-50"
        >
          {reading ? 'Reading file…' : 'Import workouts (.md)'}
        </button>
        <p className="text-zinc-400 text-xs mt-3">
          Existing workouts are kept. Only missing dates are added and saved to your account automatically.
        </p>
        {importFile && (
          <div className="mt-4 border border-zinc-700 rounded-xl p-3 space-y-3" aria-label="Import preview">
            <p className="text-zinc-200 text-sm break-all">{importFile.name}</p>
            <p className="text-zinc-300 text-sm">
              Sessions to add: {importPlan.addedCount} · Dates to skip: {importPlan.skippedCount} · New exercises: {importPlan.exerciseCount}
            </p>
            {importFile.data.warnings.map(warning => (
              <p key={warning} className="text-amber-300 text-xs">{warning}</p>
            ))}
            {importPlan.addedCount === 0 && <p className="text-zinc-400 text-sm">Every date already has a workout. There is nothing to add.</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setImportFile(null)} className="flex-1 bg-zinc-800 text-zinc-300 rounded-xl py-2.5 text-sm">Cancel</button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!importPlan.addedCount}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        )}
        {importError && <p role="alert" className="mt-3 text-red-300 text-sm">{importError}</p>}
        {importResult && <p role="status" className="mt-3 text-green-300 text-sm">{importResult}</p>}
        {syncing && <p role="status" className="mt-3 text-zinc-400 text-xs">Saving to your account…</p>}
        {syncError && (
          <div role="alert" className="mt-3 text-red-300 text-sm">
            <p>Could not save to your account. Please retry before closing this screen.</p>
            <button type="button" onClick={retrySave} disabled={syncing} className="mt-2 underline disabled:opacity-50">Retry save</button>
          </div>
        )}
      </div>

      {/* Status message */}
      {status.msg && (
        <div className={`rounded-xl p-3 mb-4 text-sm text-center ${
          status.ok === true ? 'bg-green-900/30 text-green-300 border border-green-800' :
          status.ok === false ? 'bg-red-900/30 text-red-300 border border-red-800' :
          'bg-zinc-800 text-zinc-400'
        }`}>
          {status.msg}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={save}
        className="w-full bg-blue-600 text-white font-semibold rounded-2xl py-4 active:bg-blue-700"
      >
        Save
      </button>
    </div>
  )
}
