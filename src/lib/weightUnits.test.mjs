import test from 'node:test'
import assert from 'node:assert/strict'
import { displayWeight, storedWeight, formatWeight } from './weightUnits.js'
import { storage } from './storage.js'

test('converts existing kg records and preserves pounds entered by the user', () => {
  assert.equal(displayWeight(20, 'lbs'), 44.09)
  assert.equal(storedWeight(100, 'lbs'), 45.359237)
  for (const pounds of [0, 2.5, 100, 225.5]) {
    assert.equal(displayWeight(storedWeight(pounds, 'lbs'), 'lbs'), pounds)
  }
  assert.equal(displayWeight(82.5, 'kg'), 82.5)
  assert.equal(formatWeight(null, 'lbs'), '?lbs')
  assert.equal(formatWeight(0, 'kg'), '0kg')
})

test('defaults to kg and persists a valid device weight preference', () => {
  const values = new Map()
  const original = globalThis.localStorage
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  try {
    assert.equal(storage.getWeightUnit(), 'kg')
    storage.setWeightUnit('lbs')
    assert.equal(storage.getWeightUnit(), 'lbs')
    storage.setWeightUnit('kg')
    assert.equal(storage.getWeightUnit(), 'kg')
    values.set('wl_weight_unit', 'invalid')
    assert.equal(storage.getWeightUnit(), 'kg')
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})
