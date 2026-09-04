import { formatDate, localTodayStr } from './dateUtils.js'
import { normalizeExercise } from './exerciseLibrary.js'

function summarizeSet(set, type) {
  if (type === 'cardio') {
    const parts = []
    if (set.duration_min != null) parts.push(`${set.duration_min} min`)
    if (set.distance_km != null) parts.push(`${set.distance_km}km`)
    if (set.speed_kmh != null) parts.push(`${set.speed_kmh}km/h`)
    if (set.incline_pct != null) parts.push(`Incline ${set.incline_pct}%`)
    if (set.calories != null) parts.push(`${set.calories}kcal`)
    return parts.join(' · ') || '-'
  }
  if (type === 'bodyweight') {
    const w = set.added_weight ? `+${set.added_weight}kg` : ''
    return `Bodyweight${w} × ${set.reps ?? '?'} reps`
  }
  return `${set.weight ?? '?'}kg × ${set.reps ?? '?'} reps`
}

function exerciseLookup(exercises) {
  const map = new Map()
  for (const e of exercises) map.set(e.id, e)
  return map
}

export function buildMarkdown(sessions, exercises) {
  const englishExercises = exercises.map(normalizeExercise)
  const map = exerciseLookup(englishExercises)
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const lines = []
  lines.push('# Workout history')
  lines.push('')
  lines.push(`- Exported on: ${formatDate(localTodayStr(), { year: 'numeric', month: 'long', day: 'numeric' })}`)
  lines.push(`- Total sessions: ${sorted.length}`)
  lines.push('')
  // Keep the readable report, plus the original values needed for lossless restore.
  const backup = JSON.stringify({ version: 1, sessions: sorted, exercises: englishExercises })
    .replace(/</g, '\\u003c')
  lines.push('<!-- workout-backup:v1', backup, '-->', '')

  if (sorted.length === 0) {
    lines.push('_No workouts._')
    return lines.join('\n')
  }

  for (const session of sorted) {
    lines.push(`## ${session.date}`)
    const meta = []
    if (session.duration_min) meta.push(`Total ${session.duration_min} min`)
    const seList = session.exercises ?? []
    meta.push(`${seList.length} exercises`)
    lines.push(`_${meta.join(' · ')}_`)
    lines.push('')

    if (seList.length === 0) {
      lines.push('- _No exercises recorded_')
      lines.push('')
      continue
    }

    for (const se of seList) {
      const ex = map.get(se.exerciseId)
      const name = ex?.name || se.exerciseId
      const cat = ex?.category ? ` _(${ex.category})_` : ''
      lines.push(`### ${name}${cat}`)
      const sets = se.sets ?? []
      if (sets.length === 0) {
        lines.push('- _No sets_')
      } else if (ex?.type === 'cardio') {
        lines.push(`- ${summarizeSet(sets[0], 'cardio')}`)
      } else {
        sets.forEach((s, i) => {
          lines.push(`${i + 1}. ${summarizeSet(s, ex?.type)}`)
        })
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function downloadTextFile(content, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportFilename(ext) {
  return `workout-${localTodayStr()}.${ext}`
}
