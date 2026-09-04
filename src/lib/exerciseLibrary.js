import { DEFAULT_EXERCISES, LEGACY_CATEGORIES, LEGACY_EXERCISE_NAMES } from '../data/exercises.js'

export function normalizeCategory(category) {
  return Object.hasOwn(LEGACY_CATEGORIES, category) ? LEGACY_CATEGORIES[category] : category
}

export function normalizeExercise(exercise) {
  const category = normalizeCategory(exercise.category)
  const base = DEFAULT_EXERCISES.find(base =>
    base.category === category && base.type === exercise.type &&
    (exercise.name === base.name || exercise.name === LEGACY_EXERCISE_NAMES[base.id]))
  // Translate known names while retaining IDs and all recorded metadata.
  // Arbitrary user-written names are not replaced based on ID alone.
  return { ...exercise, name: base?.name ?? exercise.name, category }
}

function sameExercise(a, b) {
  return a.name === b.name && a.category === b.category && a.type === b.type
}

export function isDefaultExercise(exercise) {
  const normalized = normalizeExercise(exercise)
  return DEFAULT_EXERCISES.some(base => sameExercise(base, normalized))
}

export function mergeDefaultExercises(savedExercises = []) {
  // Preserve existing IDs: historical sessions reference them, including custom IDs.
  const normalized = savedExercises.map(normalizeExercise)
  const missing = DEFAULT_EXERCISES.filter(base =>
    !normalized.some(saved => saved.id === base.id || sameExercise(saved, base)))
  return [...normalized, ...missing]
}
