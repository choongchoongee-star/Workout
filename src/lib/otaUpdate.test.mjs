import test from 'node:test'
import assert from 'node:assert/strict'
import { createUpdater, validateUpdate, UPDATE_BASE } from './otaUpdate.js'

const runtime = 'ios-0123456789abcdef'
const id = 'a'.repeat(64)
const bundle = { bundleId: id, checksum: id, signature: 'YWJj', url: `${UPDATE_BASE}${runtime}/${id}.zip` }
const manifest = { schema: 1, runtime, bundle }
function setup(overrides = {}, response = manifest) {
  const calls = []
  const plugin = {
    ready: async () => calls.push('ready'), getChannel: async () => ({ channel: runtime }),
    getCurrentBundle: async () => ({ bundleId: null }), getBlockedBundles: async () => ({ bundleIds: [] }),
    getDownloadedBundles: async () => ({ bundleIds: [] }),
    downloadBundle: async (value) => calls.push(value), setNextBundle: async () => calls.push('next'),
    reset: async () => calls.push('reset'), ...overrides,
  }
  return { calls, updater: createUpdater({ native: () => true, plugin, fetcher: async () => ({ ok: true, json: async () => response }) }) }
}
test('downloads a signed bundle and schedules it without reloading', async () => {
  const { calls, updater } = setup()
  assert.equal(await updater.check(), 'pending')
  assert.deepEqual(calls, ['ready', { ...bundle, artifactType: 'zip' }, 'next'])
})
test('rejects incompatible runtimes, foreign hosts and unsigned updates', () => {
  assert.throws(() => validateUpdate(manifest, 'ios-other'))
  assert.throws(() => validateUpdate({ ...manifest, bundle: { ...bundle, url: 'https://example.com/a.zip' } }, runtime))
  assert.throws(() => validateUpdate({ ...manifest, bundle: { ...bundle, signature: '' } }, runtime))
})
test('failed verification never schedules an update', async () => {
  const { calls, updater } = setup({ downloadBundle: async () => { throw new Error('Invalid signature') } })
  assert.equal(await updater.check(), 'unavailable')
  assert.deepEqual(calls, ['ready'])
})
test('does not download a rolled-back or current bundle', async () => {
  const blocked = setup({ getBlockedBundles: async () => ({ bundleIds: [id] }) })
  assert.equal(await blocked.updater.check(), 'blocked')
  assert.deepEqual(blocked.calls, ['ready'])
  const current = setup({ getCurrentBundle: async () => ({ bundleId: id }) })
  assert.equal(await current.updater.check(), 'current')
  assert.deepEqual(current.calls, ['ready'])
})
test('reuses downloaded bundles and serializes concurrent checks', async () => {
  const { calls, updater } = setup({ getDownloadedBundles: async () => ({ bundleIds: [id] }) })
  assert.deepEqual(await Promise.all([updater.check(), updater.check()]), ['pending', 'pending'])
  assert.deepEqual(calls, ['ready', 'next'])
})
test('empty release resets to embedded version on next start', async () => {
  const { calls, updater } = setup({}, { ...manifest, bundle: null })
  assert.equal(await updater.check(), 'current')
  assert.deepEqual(calls, ['ready', 'reset'])
})
test('web preview never contacts an update server', async () => {
  const updater = createUpdater({ native: () => false, fetcher: async () => assert.fail('Unexpected network') })
  assert.equal(await updater.check(), 'web')
})
