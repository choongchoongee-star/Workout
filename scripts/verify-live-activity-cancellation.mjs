import assert from 'node:assert/strict'
import { createServer } from 'vite'

const calls = []
let release
let nativeState = { status: 'idle' }
const state = {
  storage: { getRestSeconds: () => 60 },
  bridge: {
    async start(input) { calls.push(['start', input]) },
    async end(id) { calls.push(['end', id]) },
    async getState() { return nativeState },
  },
  notifications: {
    allocateRestNotificationId: (() => { let id = 2000; return () => ++id })(),
    prepareRestNotification() {},
    scheduleRestNotification: () => new Promise(resolve => { release = resolve }),
    cancelRestNotification: async () => { calls.push(['cancel']) },
    notifyRestComplete() {},
  },
}
globalThis.__restCancellationTest = state
const modules = {
  react: 'export const useSyncExternalStore = (_, get) => get()',
  '@capacitor/core': "export const Capacitor = { getPlatform: () => 'ios' }",
  './storage': 'export const storage = globalThis.__restCancellationTest.storage',
  './restLiveActivity': 'export const restLiveActivity = globalThis.__restCancellationTest.bridge',
  './restNotification': 'export const { allocateRestNotificationId, prepareRestNotification, scheduleRestNotification, cancelRestNotification, notifyRestComplete } = globalThis.__restCancellationTest.notifications',
}
const server = await createServer({ configFile: false, ssr: { noExternal: ['react', '@capacitor/core'] }, server: { middlewareMode: true }, plugins: [{
  name: 'rest-cancellation-test-doubles', enforce: 'pre',
  resolveId(id) { if (id in modules) return '\0rest-test:' + id },
  load(id) { if (id.startsWith('\0rest-test:')) return modules[id.slice('\0rest-test:'.length)] },
}] })
try {
  const timer = await server.ssrLoadModule('/src/lib/activeRestTimer.js')
  timer.startRestTimer()
  assert.equal(calls.filter(([name]) => name === 'start').length, 0)
  const first = timer.useRestTimer().timerID
  release()
  await Promise.resolve()
  assert.equal(calls.find(([name]) => name === 'start')[1].timerID, first)
  timer.cancelRestTimerFromActivity({ timerID: first })
  assert.equal(timer.useRestTimer().active, false)

  timer.startRestTimer()
  const second = timer.useRestTimer().timerID
  timer.cancelRestTimerFromActivity({ timerID: first })
  assert.equal(timer.useRestTimer().active, true)
  release()
  await Promise.resolve()
  nativeState = { status: 'cancelled', timerID: first }
  await timer.restoreRestTimer()
  assert.equal(timer.useRestTimer().active, true)
  nativeState = { status: 'cancelled', timerID: second }
  await timer.restoreRestTimer()
  assert.equal(timer.useRestTimer().active, false)

  const starts = calls.filter(([name]) => name === 'start').length
  timer.startRestTimer()
  timer.skipRestTimer()
  release()
  await Promise.resolve()
  assert.equal(calls.filter(([name]) => name === 'start').length, starts)
  console.log('PASS: scheduling precedes Live Activity; matching cancellation stops timer; old IDs cannot stop newer timers; resume reconciliation; Skip suppresses delayed start')
} finally {
  await server.close()
  delete globalThis.__restCancellationTest
}
