import assert from 'node:assert/strict'
import test from 'node:test'
import { loadLocalWorkoutData, saveLocalWorkoutData, loadNativeWorkoutData, parseLocalWorkoutData, saveNativeWorkoutData } from './localWorkoutData.js'

function memoryDisk() {
  const files = new Map()
  return { files, filesystem: {
    readFile: async ({ path }) => {
      if (!files.has(path)) throw new Error('not found')
      return { data: files.get(path) }
    },
    writeFile: async ({ path, data }) => { files.set(path, data) },
    deleteFile: async ({ path }) => { files.delete(path) },
  } }
}
const snapshot = id => ({ exercises: [], sessions: [{ id }] })

test('Android durable journal is written before async file work and wins over stale WebView recovery data', async () => {
  const { files, filesystem } = memoryDisk()
  const nativeJournal = {
    write: raw => { files.set('workout-data.journal.json', raw); return true },
    clear: raw => { if (files.get('workout-data.journal.json') === raw) files.delete('workout-data.journal.json') },
  }
  const options = { native: true, filesystem, nativeJournal, journalStorage: null }
  const saving = saveLocalWorkoutData(snapshot('durable'), options)
  assert.equal(JSON.parse(files.get('workout-data.journal.json')).sessions[0].id, 'durable')
  await saving
  files.set('workout-data.journal.json', JSON.stringify(snapshot('newest')))
  const recovered = await loadLocalWorkoutData({ ...options, journalStorage: { getItem: () => JSON.stringify(snapshot('stale')), removeItem: () => {} } })
  assert.equal(recovered.data.sessions[0].id, 'newest')
})

test('journal quota failure cannot replay an old snapshot over a newer native save', async () => {
  const { filesystem } = memoryDisk()
  let oldJournal = JSON.stringify(snapshot('old'))
  const journalStorage = { getItem: () => oldJournal, setItem: () => { throw new Error('quota') }, removeItem: () => { oldJournal = null } }
  const options = { native: true, filesystem, journalStorage }
  await saveLocalWorkoutData(snapshot('new'), options)
  assert.equal((await loadLocalWorkoutData(options)).data.sessions[0].id, 'new')
})

test('a complete pending write is recovered ahead of the older primary; corrupt pending cannot replace it', async () => {
  const { files, filesystem } = memoryDisk()
  files.set('workout-data.json', JSON.stringify(snapshot('old')))
  files.set('workout-data.pending.json', JSON.stringify(snapshot('new')))
  assert.equal((await loadNativeWorkoutData(filesystem)).data.sessions[0].id, 'new')
  files.set('workout-data.pending.json', '{broken')
  assert.equal((await loadNativeWorkoutData(filesystem)).data.sessions[0].id, 'new')
})

test('rapid saves retain the latest journal until the matching serialized native write finishes', async () => {
  const { files, filesystem } = memoryDisk()
  const journal = new Map()
  const journalStorage = { getItem: k => journal.get(k), setItem: (k, v) => journal.set(k, v), removeItem: k => journal.delete(k) }
  const options = { native: true, filesystem, journalStorage }
  const first = saveLocalWorkoutData(snapshot('first'), options)
  const second = saveLocalWorkoutData(snapshot('last'), options)
  assert.equal(JSON.parse(journal.values().next().value).sessions[0].id, 'last')
  await first
  assert.equal(JSON.parse(journal.values().next().value).sessions[0].id, 'last')
  await second
  assert.equal(journal.size, 0)
  assert.equal(JSON.parse(files.get('workout-data.json')).sessions[0].id, 'last')
})

test('failed native save retains the journal and restart replays it instead of older records', async () => {
  const { files, filesystem } = memoryDisk()
  files.set('workout-data.json', JSON.stringify(snapshot('old')))
  const journal = new Map()
  const journalStorage = { getItem: k => journal.get(k), setItem: (k, v) => journal.set(k, v), removeItem: k => journal.delete(k) }
  await assert.rejects(saveLocalWorkoutData(snapshot('latest'), {
    native: true, journalStorage,
    filesystem: { ...filesystem, writeFile: async () => { throw new Error('disk unavailable') } },
  }))
  const result = await loadLocalWorkoutData({ native: true, filesystem, journalStorage })
  assert.equal(result.data.sessions[0].id, 'latest')
  assert.equal(journal.size, 0)
})

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
