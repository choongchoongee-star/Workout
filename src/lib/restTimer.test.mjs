import assert from 'node:assert/strict'
import test from 'node:test'
import { getRemainingSeconds } from './restTimer.js'

test('calculates remaining time from the deadline after a background pause', () => {
  const startedAt = 1_000_000
  const endsAt = startedAt + 90_000

  assert.equal(getRemainingSeconds(endsAt, startedAt), 90)
  assert.equal(getRemainingSeconds(endsAt, startedAt + 61_200), 29)
  assert.equal(getRemainingSeconds(endsAt, startedAt + 120_000), 0)
})

test('rounds a partial final second up for the countdown display', () => {
  assert.equal(getRemainingSeconds(10_001, 10_000), 1)
})
