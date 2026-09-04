import test from 'node:test'
import assert from 'node:assert/strict'
import { openAppSettings } from './appSettings.js'

test('opens the app-specific iPhone Settings page on native platforms', async () => {
  let calls = 0
  const opened = await openAppSettings({
    isNativePlatform: () => true,
    settings: { open: async () => { calls += 1 } },
  })

  assert.equal(opened, true)
  assert.equal(calls, 1)
})

test('does not call the native bridge on the web', async () => {
  const opened = await openAppSettings({
    isNativePlatform: () => false,
    settings: { open: async () => assert.fail('native bridge should not run') },
  })

  assert.equal(opened, false)
})

test('reports a native Settings launch failure', async () => {
  const opened = await openAppSettings({
    isNativePlatform: () => true,
    settings: { open: async () => { throw new Error('unavailable') } },
  })

  assert.equal(opened, false)
})
