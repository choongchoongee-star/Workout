import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLocalWorkoutData } from './localWorkoutData.js'

test('reads a valid versioned local workout file', () => {
  const result = parseLocalWorkoutData(JSON.stringify({
    version: 1,
    exercises: [{ id: 'bench-press' }],
    sessions: [{ id: '2026-09-04' }],
  }))

  assert.equal(result.exercises[0].id, 'bench-press')
  assert.equal(result.sessions[0].id, '2026-09-04')
})

test('rejects corrupt local workout data instead of overwriting it', () => {
  assert.throws(
    () => parseLocalWorkoutData('{"version":1,"sessions":[]}'),
    /invalid/,
  )
})
