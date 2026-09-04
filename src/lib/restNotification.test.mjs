import assert from 'node:assert/strict'
import test from 'node:test'
import { cancelRestNotification, notifyRestComplete, scheduleRestNotification } from './restNotification.js'

function audioContext() {
  const calls = { start: 0, stop: 0 }
  return {
    calls,
    state: 'running',
    currentTime: 10,
    destination: {},
    createOscillator: () => ({
      frequency: { setValueAtTime() {} },
      connect() {},
      start() { calls.start += 1 },
      stop() { calls.stop += 1 },
    }),
    createGain: () => ({
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    }),
  }
}

test('plays exactly one completion tone when audio is available', async () => {
  const context = audioContext()
  let vibrations = 0

  const result = await notifyRestComplete({
    context,
    vibrate: () => { vibrations += 1; return true },
  })

  assert.equal(result, 'sound')
  assert.deepEqual(context.calls, { start: 1, stop: 1 })
  assert.equal(vibrations, 0)
})

test('vibrates exactly once when sound cannot play', async () => {
  let vibrations = 0

  const result = await notifyRestComplete({
    context: null,
    createContext: () => null,
    vibrate: duration => { vibrations += 1; assert.equal(duration, 250); return true },
  })

  assert.equal(result, 'vibration')
  assert.equal(vibrations, 1)
})

test('schedules and cancels the iOS system notification at the deadline', async () => {
  const calls = { cancelled: 0, scheduled: null }
  const notifications = {
    checkPermissions: async () => ({ display: 'granted' }),
    cancel: async () => { calls.cancelled += 1 },
    schedule: async options => { calls.scheduled = options.notifications[0] },
  }
  const endsAt = 2_000_000

  assert.equal(await scheduleRestNotification(endsAt, {
    isNativePlatform: () => true,
    notifications,
  }), true)
  assert.equal(calls.cancelled, 1)
  assert.equal(calls.scheduled.title, 'Rest complete')
  assert.equal(calls.scheduled.schedule.at.getTime(), endsAt)
  assert.equal(calls.scheduled.sound, 'default')
  assert.equal(calls.scheduled.foreground, true)

  await cancelRestNotification({ isNativePlatform: () => true, notifications })
  assert.equal(calls.cancelled, 2)
})
