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
