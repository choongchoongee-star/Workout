// Stored workouts and Markdown backups always use kg. Only UI values convert.
const KG_PER_LB = 0.45359237

export function displayWeight(kg, unit) {
  if (kg == null) return '?'
  return Number((unit === 'lbs' ? kg / KG_PER_LB : kg).toFixed(2))
}

export function storedWeight(value, unit) {
  return unit === 'lbs' ? value * KG_PER_LB : value
}

export function formatWeight(kg, unit) {
  return `${displayWeight(kg, unit)}${unit}`
}
