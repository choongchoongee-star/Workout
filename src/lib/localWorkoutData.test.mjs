import assert from 'node:assert/strict'
import test from 'node:test'
import { loadNativeWorkoutData, parseLocalWorkoutData, saveNativeWorkoutData } from './localWorkoutData.js'

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

test('restores the last verified native backup when the primary file is corrupt', async () => {
  const files = new Map([
    ['workout-data.json', '{broken'],
    ['workout-data.backup.json', JSON.stringify({
      version: 1,
      exercises: [{ id: 'squat' }],
      sessions: [{ id: '2026-09-05' }],
    })],
  ])
  const filesystem = {
    readFile: async ({ path }) => {
      if (!files.has(path)) throw Object.assign(new Error('not found'), { code: 'OS-PLUG-FILE-0008' })
      return { data: files.get(path) }
    },
    writeFile: async ({ path, data }) => { files.set(path, data) },
  }

  const result = await loadNativeWorkoutData(filesystem)

  assert.equal(result.recoveredFromBackup, true)
  assert.equal(result.data.sessions[0].id, '2026-09-05')
  assert.equal(parseLocalWorkoutData(files.get('workout-data.json')).exercises[0].id, 'squat')
})

test('verifies pending writes and keeps the previous native value as a safe backup', async () => {
  const first = { exercises: [{ id: 'squat' }], sessions: [{ id: '2026-09-04' }] }
  const second = { exercises: [{ id: 'squat' }], sessions: [{ id: '2026-09-05' }] }
  const files = new Map()
  const filesystem = {
    readFile: async ({ path }) => {
      if (!files.has(path)) throw Object.assign(new Error('not found'), { code: 'OS-PLUG-FILE-0008' })
      return { data: files.get(path) }
    },
    writeFile: async ({ path, data }) => { files.set(path, data) },
    deleteFile: async ({ path }) => { files.delete(path) },
  }

  await saveNativeWorkoutData(first, filesystem)
  assert.equal(parseLocalWorkoutData(files.get('workout-data.backup.json')).sessions[0].id, '2026-09-04')

  await saveNativeWorkoutData(second, filesystem)
  assert.equal(parseLocalWorkoutData(files.get('workout-data.json')).sessions[0].id, '2026-09-05')
  assert.equal(parseLocalWorkoutData(files.get('workout-data.backup.json')).sessions[0].id, '2026-09-04')
  assert.equal(files.has('workout-data.pending.json'), false)
})
