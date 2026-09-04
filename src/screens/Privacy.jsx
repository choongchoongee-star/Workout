import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="p-4 max-w-lg mx-auto pb-8 text-zinc-300">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="text-zinc-400 text-2xl leading-none">←</button>
        <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
      </div>

      <div className="space-y-6 text-sm leading-6">
        <p className="text-zinc-500">Effective September 5, 2026</p>

        <section>
          <h2 className="text-white font-semibold mb-2">Data collection</h2>
          <p>Workout Logger does not collect, transmit, sell, or share personal data. The app has no user accounts, analytics, advertising, or tracking.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-2">Data stored on your device</h2>
          <p>Your exercise library, workout sessions, and preferences are stored locally on your device. The developer cannot access this data. Deleting the app removes its local data from the device.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-2">Backups and sharing</h2>
          <p>When you choose Export, the app creates a Markdown backup and opens the iOS share sheet. You decide where to save or send that file. Workout Logger does not receive a copy.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-2">Notifications</h2>
          <p>If you allow notifications, the app schedules local rest timer alerts on your device. No notification server or remote push service is used.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-2">Changes and support</h2>
          <p>This policy may be updated when the app’s data practices change. Questions can be submitted through the project support page.</p>
          <a href="https://github.com/choongchoongee-star/Workout/issues" target="_blank" rel="noreferrer" className="inline-block mt-2 text-blue-400 underline">Open support page</a>
        </section>
      </div>
    </div>
  )
}
