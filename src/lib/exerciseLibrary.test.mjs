import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES } from '../data/exercises.js'
import { isDefaultExercise, mergeDefaultExercises } from './exerciseLibrary.js'

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
