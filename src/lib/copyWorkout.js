import { selectableExercises } from './exerciseLibrary.js'

// Historical cardio remains readable, but must not become new workout entries.
export function copyWorkoutExercises(session, exercises) {
  const allowed = new Set(selectableExercises(exercises).map(exercise => exercise.id))
  return (session.exercises ?? []).filter(card => allowed.has(card.exerciseId)).map(card => ({
    ...structuredClone(card),
    sets: (card.sets ?? []).map(set => ({ ...structuredClone(set), done: false })),
  }))
}
