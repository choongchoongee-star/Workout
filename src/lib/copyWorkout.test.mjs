import test from 'node:test'
import assert from 'node:assert/strict'
import { copyWorkoutExercises } from './copyWorkout.js'

test('copy retains order, duplicate cards, original equipment and set values without changing history', () => {
  const exercises = [{ id: 'bench', type: 'weight' }, { id: 'pullup', type: 'bodyweight' }]
  const session = { date: '2020-01-01', duration_min: 60, exercises: [
    { exerciseId: 'bench', equipment: 'smith', sets: [{ weight: 42.5, reps: 8, done: true }] },
    { exerciseId: 'pullup', sets: [{ added_weight: 0, reps: 10, done: true }] },
    { exerciseId: 'bench', equipment: 'dumbbell', sets: [] },
  ] }
  const original = structuredClone(session)
  const copied = copyWorkoutExercises(session, exercises)
  assert.deepEqual(copied, session.exercises.map(card => ({ ...card, sets: card.sets.map(set => ({ ...set, done: false })) })))
  copied[0].sets[0].weight = 100
  copied[2].sets.push({ weight: 20, reps: 10 })
  assert.deepEqual(session, original)
})

test('copy excludes retired cardio and missing definitions, preserving eligible empty cards', () => {
  const exercises = [{ id: 'bike', type: 'cardio' }, { id: 'legacy', type: 'weight', category: '유산소' }, { id: 'bench', type: 'weight' }]
  const source = { exercises: ['bike', 'legacy', 'missing', 'bench'].map(exerciseId => ({ exerciseId, sets: [] })) }
  assert.deepEqual(copyWorkoutExercises(source, exercises), [{ exerciseId: 'bench', sets: [] }])
  assert.deepEqual(copyWorkoutExercises({ exercises: source.exercises.slice(0, 3) }, exercises), [])
})
