import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cancelRestNotification,
  getRestNotificationPermission,
  notifyRestComplete,
  requestRestNotificationPermission,
  scheduleRestNotification,
} from './restNotification.js'

test('Skip waits for an in-flight native schedule so no alarm remains afterward', async () => {
  let release, entered
  const waiting = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { release = resolve })
  let pending = false
  const options = { isNativePlatform: () => true, notifications: {
    checkPermissions: async () => ({ display: 'granted' }),
    cancel: async () => { pending = false },
    schedule: async () => { entered(); await gate; pending = true },
  } }
  const scheduling = scheduleRestNotification(Date.now() + 60000, options)
  await waiting
  const cancellation = cancelRestNotification(options)
  release()
  await Promise.all([scheduling, cancellation])
  assert.equal(pending, false, 'Skip must remove even a late native schedule')
})

test('restart during native scheduling leaves only the newest deadline', async () => {
  let release, entered
  const waiting = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { release = resolve })
  let deadline = null
  const firstDeadline = Date.now() + 60000
  const lastDeadline = firstDeadline + 60000
  const options = { isNativePlatform: () => true, notifications: {
    checkPermissions: async () => ({ display: 'granted' }),
    cancel: async () => { deadline = null },
    schedule: async ({ notifications }) => {
      const at = notifications[0].schedule.at.getTime()
      if (at === firstDeadline) { entered(); await gate }
      deadline = at
    },
  } }
  const first = scheduleRestNotification(firstDeadline, options)
  await waiting
  const last = scheduleRestNotification(lastDeadline, options)
  release()
  assert.deepEqual(await Promise.all([first, last]), [false, true])
  assert.equal(deadline, lastDeadline)
})

test('Skip during permission prompt prevents a later grant from scheduling', async () => {
  let grant, entered
  const waiting = new Promise(resolve => { entered = resolve })
  const permission = new Promise(resolve => { grant = resolve })
  let schedules = 0
  const options = { isNativePlatform: () => true, notifications: {
    checkPermissions: async () => ({ display: 'prompt' }),
    requestPermissions: () => { entered(); return permission },
    cancel: async () => {},
    schedule: async () => { schedules++ },
  } }
  const pending = scheduleRestNotification(Date.now() + 60000, options)
  await waiting
  await cancelRestNotification(options)
  grant({ display: 'granted' })
  assert.equal(await pending, false)
  assert.equal(schedules, 0)
})

test('native scheduling failure does not block the next timer', async () => {
  let attempts = 0
  const options = { isNativePlatform: () => true, notifications: {
    checkPermissions: async () => ({ display: 'granted' }),
    cancel: async () => {},
    schedule: async () => { if (++attempts === 1) throw Error('native failure') },
  } }
  assert.equal(await scheduleRestNotification(Date.now() + 60000, options), false)
  assert.equal(await scheduleRestNotification(Date.now() + 60000, options), true)
})

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
  const endsAt = Date.now() + 60000

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

test('reports and requests the native notification permission for Settings', async () => {
  const notifications = {
    checkPermissions: async () => ({ display: 'prompt' }),
    requestPermissions: async () => ({ display: 'granted' }),
  }
  const options = { isNativePlatform: () => true, notifications }

  assert.equal(await getRestNotificationPermission(options), 'prompt')
  assert.equal(await requestRestNotificationPermission(options), 'granted')
})

test('an expired deadline after permission handling is not scheduled in the past', async () => {
  let scheduled = false
  const result = await scheduleRestNotification(Date.now() - 1, {
    isNativePlatform: () => true,
    notifications: {
      checkPermissions: async () => ({ display: 'granted' }),
      cancel: async () => {},
      schedule: async () => { scheduled = true },
    },
  })
  assert.equal(result, false)
  assert.equal(scheduled, false)
})
