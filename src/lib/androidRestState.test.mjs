import test from 'node:test'
import assert from 'node:assert/strict'
import { createAndroidRestState } from './androidRestState.js'

function store() {
  let data = null
  return { getItem: () => data, setItem: (_, value) => { data = value }, removeItem: () => { data = null } }
}

test('a new timer instance restores the original deadline and discards expired or cancelled timers', () => {
  const storage = store()
  const state = { timerID: 'rest-1', startedAt: 1000, endsAt: 91000 }
  createAndroidRestState(() => storage).save(state)
  const restarted = createAndroidRestState(() => storage)
  assert.deepEqual(restarted.read(61000), { ...state, status: 'active' })
  assert.equal(restarted.read(92000), null)
  assert.equal(storage.getItem(), null)
  restarted.save(state)
  restarted.clear()
  assert.equal(restarted.read(2000), null)
})

test('corrupt storage and invalid deadlines do not restore a timer or crash startup', () => {
  const storage = store()
  const timer = createAndroidRestState(() => storage)
  for (const value of ['{broken', '{"timerID":"x","startedAt":10,"endsAt":5}', '{}']) {
    storage.setItem('', value)
    assert.equal(timer.read(0), null)
  }
  assert.equal(createAndroidRestState(() => { throw new Error('unavailable') }).read(), null)
})
