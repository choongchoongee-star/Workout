import { formatDate, localTodayStr } from './dateUtils'

function summarizeSet(set, type) {
  if (type === 'cardio') {
    const parts = []
    if (set.duration_min != null) parts.push(`${set.duration_min}분`)
    if (set.distance_km != null) parts.push(`${set.distance_km}km`)
    if (set.speed_kmh != null) parts.push(`${set.speed_kmh}km/h`)
    if (set.incline_pct != null) parts.push(`경사 ${set.incline_pct}%`)
    if (set.calories != null) parts.push(`${set.calories}kcal`)
    return parts.join(' · ') || '-'
  }
  if (type === 'bodyweight') {
    const w = set.added_weight ? `+${set.added_weight}kg` : ''
    return `체중${w} × ${set.reps ?? '?'}회`
  }
  return `${set.weight ?? '?'}kg × ${set.reps ?? '?'}회`
}

function exerciseLookup(exercises) {
  const map = new Map()
  for (const e of exercises) map.set(e.id, e)
  return map
}

export function buildMarkdown(sessions, exercises) {
  const map = exerciseLookup(exercises)
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const lines = []
  lines.push('# 운동 기록')
  lines.push('')
  lines.push(`- 내보낸 날짜: ${formatDate(localTodayStr(), { year: 'numeric', month: 'long', day: 'numeric' })}`)
  lines.push(`- 총 세션 수: ${sorted.length}`)
  lines.push('')

  if (sorted.length === 0) {
    lines.push('_기록이 없습니다._')
    return lines.join('\n')
  }

  for (const session of sorted) {
    const dateLabel = formatDate(session.date, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    lines.push(`## ${dateLabel}`)
    const meta = []
    if (session.duration_min) meta.push(`총 ${session.duration_min}분`)
    const seList = session.exercises ?? []
    meta.push(`${seList.length}종목`)
    lines.push(`_${meta.join(' · ')}_`)
    lines.push('')

    if (seList.length === 0) {
      lines.push('- _기록된 운동 없음_')
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
        lines.push('- _세트 없음_')
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
