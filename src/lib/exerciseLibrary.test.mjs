import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES } from '../data/exercises.js'
import { isDefaultExercise, mergeDefaultExercises } from './exerciseLibrary.js'
import { equipmentRecords, exerciseChoices, familyId } from './equipment.js'
import { buildMarkdown } from './exportUtils.js'
import { parseWorkoutMarkdown } from './importUtils.js'
import { localizedMovementName } from './exerciseLabels.js'
import { setLanguage } from './i18n.js'

test('promoted movements retain custom references, input values and progress through backup restore', () => {
  const saved = [
    { id: 'custom-hip', name: 'Hip Thrust', category: 'Legs', type: 'weight' },
    { id: 'custom-high', name: 'High Pull', category: 'Shoulders', type: 'weight' },
    { id: 'custom-single', name: 'One leg deadlift', category: 'Legs', type: 'weight' },
    { id: 'custom-inverted', name: 'Inverted Row', category: 'Back', type: 'weight' },
  ]
  const sessions = [{ id: '2020-01-01', date: '2020-01-01', exercises: saved.map(ex => ({
    exerciseId: ex.id, equipment: 'bodyweight', sets: [{ weight: 2, reps: 7, done: true }],
  })) }]
  const merged = mergeDefaultExercises(saved)
  const families = ['hip-thrust', 'high-pull', 'single-leg-deadlift', 'inverted-row']
  saved.forEach((ex, i) => {
    const promoted = merged.find(e => e.id === ex.id)
    assert.equal(isDefaultExercise(promoted), true)
    assert.equal(familyId(promoted), families[i])
    assert.equal(exerciseChoices(merged).filter(e => familyId(e) === families[i]).length, 1)
    assert.deepEqual(equipmentRecords(sessions, merged, promoted, 'bodyweight')[0].sets, sessions[0].exercises[i].sets)
  })
  assert.equal(merged.find(e => e.id === 'custom-single').name, 'Single-leg Deadlift')
  assert.deepEqual(mergeDefaultExercises(merged), merged)
  const restored = parseWorkoutMarkdown(buildMarkdown(sessions, merged))
  assert.deepEqual(restored.sessions, sessions)
  assert.deepEqual(mergeDefaultExercises(restored.exercises), merged)
  setLanguage('ko')
  try {
    assert.deepEqual(saved.map(ex => localizedMovementName(merged.find(e => e.id === ex.id))),
      ['힙 쓰러스트', '하이 풀', '싱글 레그 데드리프트', '인버티드 로우'])
  } finally { setLanguage('en') }
})

test('existing accounts receive missing defaults without changing historical exercise IDs', () => {
  const base = DEFAULT_EXERCISES.find(ex => ex.id === 'shoulder-press')
  const promoted = { ...base, id: 'custom-existing-shoulder', met: null }
  const unrelated = { id: 'custom-other', name: '별도 운동', category: '어깨', type: 'weight' }
  const saved = [promoted, unrelated]
  const before = structuredClone(saved)
  const merged = mergeDefaultExercises(saved)
  assert.deepEqual(saved, before)
  assert.deepEqual(merged.find(ex => ex.id === promoted.id), promoted)
  assert.equal(merged.some(ex => ex.id === base.id), false)
  assert.equal(merged.filter(ex => ex.name === base.name).length, 1)
  assert.equal(merged.length, DEFAULT_EXERCISES.length + 1)
  assert.equal(isDefaultExercise(promoted), true)
  assert.equal(isDefaultExercise(unrelated), false)
  assert.deepEqual(mergeDefaultExercises(merged), merged)
})

test('same names with different categories or input types remain separate', () => {
  const base = DEFAULT_EXERCISES.find(ex => ex.id === 'back-extension')
  for (const custom of [
    { ...base, id: 'custom-bodyweight', type: 'bodyweight' },
    { ...base, id: 'custom-back', category: '등' },
  ]) {
    const merged = mergeDefaultExercises([custom])
    assert.equal(merged.filter(ex => ex.name === base.name).length, 2)
    assert.equal(isDefaultExercise(custom), false)
  }
})

test('new accounts receive the full catalog with unique IDs and definitions', () => {
  const merged = mergeDefaultExercises()
  assert.deepEqual(merged, DEFAULT_EXERCISES)
  assert.equal(new Set(merged.map(ex => ex.id)).size, merged.length)
  assert.equal(new Set(merged.map(ex => JSON.stringify([ex.name, ex.category, ex.type]))).size, merged.length)
})
