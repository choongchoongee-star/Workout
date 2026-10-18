import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES, LEGACY_CARDIO_EXERCISES } from '../data/exercises.js'
import { mergeDefaultExercises, selectableExercises } from './exerciseLibrary.js'
import { buildMarkdown } from './exportUtils.js'
import { parseWorkoutMarkdown, planWorkoutImport } from './importUtils.js'

test('saved and imported cardio stays intact but cannot reappear in exercise choices', () => {
  const custom = { id: 'custom-bike', name: 'My bike', category: 'Legs', type: 'cardio', met: 7 }
  const saved = [...LEGACY_CARDIO_EXERCISES, custom, { id: 'old-category', name: 'Old exercise', category: '유산소', type: 'weight' }]
  const sessions = [{ id: '2026-01-01', date: '2026-01-01', exercises: [{ exerciseId: custom.id, equipment: 'machine', sets: [{ duration_min: 12, distance_km: 4, speed_kmh: 20, incline_pct: 0, calories: 99 }] }] }]
  const library = mergeDefaultExercises(saved)
  assert.deepEqual(selectableExercises(library), DEFAULT_EXERCISES)
  assert.deepEqual(library.find(ex => ex.id === custom.id), custom)
  const restored = parseWorkoutMarkdown(buildMarkdown(sessions, library))
  assert.deepEqual(restored.sessions, sessions)
  const plan = planWorkoutImport({ exercises: DEFAULT_EXERCISES, sessions: [] }, restored)
  assert.deepEqual(plan.sessions, sessions)
  assert.deepEqual(plan.exercises.find(ex => ex.id === custom.id), custom)
  assert.deepEqual(selectableExercises(mergeDefaultExercises(plan.exercises)), DEFAULT_EXERCISES)
  assert.ok(!mergeDefaultExercises().some(ex => ex.type === 'cardio'))
})
