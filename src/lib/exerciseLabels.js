import { DEFAULT_EXERCISES, LEGACY_EXERCISE_NAMES } from '../data/exercises.js'
import { familyId, movementName } from './equipment.js'
import { getLanguage } from './i18n.js'

const names = {
  'dumbbell-fly': '플라이', 'cable-crossover': '크로스오버',
  'one-arm-row': '원암 로우', 'barbell-curl': '바이셉스 컬',
  'reverse-pec-deck-fly': '리버스 플라이', 'cable-crunch': '크런치',
  'rowing': '로잉',
}

export function localizedMovementName(exercise) {
  const canonical = movementName(exercise)
  if (getLanguage() !== 'ko') return canonical
  // Custom names (even reused IDs) remain exactly as the user entered them.
  const base = DEFAULT_EXERCISES.find(e => e.name === exercise?.name &&
    e.category === exercise.category && e.type === exercise.type)
  if (!base) return canonical
  const family = familyId(exercise)
  return names[family] ?? LEGACY_EXERCISE_NAMES[family] ?? canonical
}
