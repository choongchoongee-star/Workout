import { t } from '../lib/i18n'

// Old workouts remain readable without offering new cardio entry or editing.
export default function LegacyCardioRecords({ sets = [] }) {
  return <div className="space-y-3 py-2">
    {sets.map((record, index) => <div key={index} className="grid grid-cols-2 gap-2 text-sm">
      {Object.entries({
        Duration: record.duration_min != null ? `${record.duration_min} ${t('min')}` : null,
        Distance: record.distance_km != null ? `${record.distance_km}km` : null,
        Speed: record.speed_kmh != null ? `${record.speed_kmh}km/h` : null,
        Incline: record.incline_pct != null ? `${record.incline_pct}%` : null,
        Calories: record.calories != null ? `${record.calories}kcal` : null,
      }).filter(([, value]) => value !== null).map(([label, value]) => <div key={label}>
        <span className="text-zinc-500 text-xs">{t(label)}</span>
        <p className="text-white">{value}</p>
      </div>)}
    </div>)}
  </div>
}
