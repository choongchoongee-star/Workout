export function getMainCategory(sessionExercises, exercises) {
  if (!sessionExercises?.length) return null
  const counts = {}
  const firstSeenIdx = {}
  sessionExercises.forEach((se, idx) => {
    const cat = exercises.find(e => e.id === se.exerciseId)?.category
    if (!cat) return
    counts[cat] = (counts[cat] || 0) + 1
    if (!(cat in firstSeenIdx)) firstSeenIdx[cat] = idx
  })
  let best = null
  for (const cat in counts) {
    if (
      best == null ||
      counts[cat] > counts[best] ||
      (counts[cat] === counts[best] && firstSeenIdx[cat] < firstSeenIdx[best])
    ) {
      best = cat
    }
  }
  return best
}

export function getLatestCategoryExerciseIds(sessions, exercises, category, excludeDate = null) {
  for (const s of sessions) {
    if (excludeDate && s.date === excludeDate) continue
    const ids = (s.exercises ?? [])
      .filter(se => exercises.find(ex => ex.id === se.exerciseId)?.category === category)
      .map(se => se.exerciseId)
    if (ids.length > 0) return ids
  }
  return []
}
