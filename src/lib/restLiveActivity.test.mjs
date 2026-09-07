import test from 'node:test'
import assert from 'node:assert/strict'
import { createRestLiveActivity } from './restLiveActivity.js'

test('web and older native bundles keep working without a Live Activity plugin', async () => {
  const client = createRestLiveActivity({ available: () => false, bridge: new Proxy({}, { get() { throw Error('must not call bridge') } }) })
  assert.deepEqual(await client.start({ timerID: 'a', startedAt: 10, endsAt: 20 }), { status: 'unsupported' })
  assert.deepEqual(await client.end('a'), { status: 'unsupported' })
})

test('rapid start, restart, Skip and restore are serialized with matching timer identifiers', async () => {
  const calls = []
  let release
  const first = new Promise(resolve => { release = resolve })
  const client = createRestLiveActivity({ available: () => true, bridge: {
    async start(input) { calls.push(['start', input]); if (input.timerID === 'a') await first; return { status: 'active' } },
    async end(input) { calls.push(['end', input]); return { status: 'ended' } },
    async getState() { calls.push(['getState']); return { status: 'idle' } },
  } })
  const a = client.start({ timerID: 'a', startedAt: 1000, endsAt: 61000 })
  const b = client.start({ timerID: 'b', startedAt: 2000, endsAt: 62000 })
  const end = client.end('b')
  const restore = client.getState()
  await Promise.resolve()
  assert.equal(calls.length, 1)
  release()
  await Promise.all([a, b, end, restore])
  assert.deepEqual(calls, [
    ['start', { timerID: 'a', startedAt: 1000, endsAt: 61000 }],
    ['start', { timerID: 'b', startedAt: 2000, endsAt: 62000 }],
    ['end', { timerID: 'b' }], ['getState'],
  ])
})

test('bridge failure is isolated and does not block later cleanup', async () => {
  const client = createRestLiveActivity({ available: () => true, bridge: {
    async start() { throw Error('denied') },
    async end() { return { status: 'ended' } },
  } })
  assert.deepEqual(await client.start({}), { status: 'unavailable' })
  assert.deepEqual(await client.end('a'), { status: 'ended' })
})
