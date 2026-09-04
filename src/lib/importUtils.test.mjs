import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMarkdown } from './exportUtils.js'
import { parseWorkoutMarkdown, planWorkoutImport } from './importUtils.js'
import { DEFAULT_EXERCISES } from '../data/exercises.js'

const exercises = [
  DEFAULT_EXERCISES.find(ex => ex.id === 'bench-press'),
  DEFAULT_EXERCISES.find(ex => ex.id === 'pullup'),
  { id: 'custom-cycle', name: 'Indoor Bike', category: 'Cardio', type: 'cardio', met: 7.5 },
]
const sessions = [{
  id: '2026-09-02', date: '2026-09-02', duration_min: 45,
  exercises: [
    { exerciseId: 'bench-press', sets: [{ weight: 42.5, reps: 8, done: true }, { weight: null, reps: null, done: false }] },
    { exerciseId: 'pullup', sets: [{ added_weight: 5, reps: 12, done: true }] },
    { exerciseId: 'custom-cycle', sets: [
      { duration_min: 15.5, distance_km: 5.2, speed_kmh: 20, incline_pct: 0, calories: 125 },
      { duration_min: null, distance_km: null, speed_kmh: null, incline_pct: null, calories: null },
    ] },
  ],
}]
const legacy = content => content.replace(/<!-- workout-backup:v1\n[^]*?\n-->\n/, '')
const rawBackup = data => `# 운동 기록\n<!-- workout-backup:v1\n${JSON.stringify(data)}\n-->`

test('new exports restore all set values, cardio rows, IDs, MET and completion states', () => {
  const result = parseWorkoutMarkdown(buildMarkdown(sessions, exercises))
  assert.deepEqual(result.sessions, sessions)
  assert.deepEqual(result.exercises, exercises)
  assert.deepEqual(result.warnings, [])
})

test('old exports restore visible weight, bodyweight and cardio values with a limitation warning', () => {
  const result = parseWorkoutMarkdown(legacy(buildMarkdown(sessions, exercises)))
  const [weight, bodyweight, cardio] = result.sessions[0].exercises
  assert.equal(result.sessions[0].duration_min, 45)
  assert.deepEqual(weight.sets, sessions[0].exercises[0].sets.map(set => ({ ...set, done: false })))
  assert.deepEqual(bodyweight.sets, [{ added_weight: 5, reps: 12, done: false }])
  assert.deepEqual(cardio.sets, [sessions[0].exercises[2].sets[0]])
  assert.equal(result.exercises[2].name, 'Indoor Bike')
  assert.equal(result.exercises[2].type, 'cardio')
  assert.equal(result.warnings.length, 1)
})

test('imports handle UTF-8 BOM and Windows line endings', () => {
  for (const content of [buildMarkdown(sessions, exercises), legacy(buildMarkdown(sessions, exercises))]) {
    assert.equal(parseWorkoutMarkdown('\uFEFF' + content.replace(/\n/g, '\r\n')).sessions[0].date, '2026-09-02')
  }
})

test('empty sessions and sets survive old exports; unknown empty exercises require a known type', () => {
  const empty = [
    { id: '2026-08-31', date: '2026-08-31', exercises: [] },
    { id: '2026-09-01', date: '2026-09-01', exercises: [{ exerciseId: 'bench-press', sets: [] }] },
  ]
  const result = parseWorkoutMarkdown(legacy(buildMarkdown(empty, exercises)))
  assert.equal(result.sessions.length, 2)
  assert.deepEqual(result.sessions[0].exercises[0].sets, [])
  const unknown = legacy(buildMarkdown(empty, exercises)).replace('Bench Press', 'New Exercise')
  assert.throws(() => parseWorkoutMarkdown(unknown), /exercise type/)
  assert.equal(parseWorkoutMarkdown(buildMarkdown([], [])).sessions.length, 0)
  assert.equal(parseWorkoutMarkdown(legacy(buildMarkdown([], []))).sessions.length, 0)
})

test('existing dates are preserved and repeat import is a no-op without orphan library additions', () => {
  const original = structuredClone(sessions[0])
  original.exercises[0].sets[0].weight = 100
  const current = { sessions: [original], exercises: DEFAULT_EXERCISES }
  const before = structuredClone(current)
  const result = planWorkoutImport(current, parseWorkoutMarkdown(buildMarkdown(sessions, exercises)))
  assert.equal(result.addedCount, 0)
  assert.equal(result.skippedCount, 1)
  assert.equal(result.exerciseCount, 0)
  assert.deepEqual(result.sessions, current.sessions)
  assert.deepEqual(current, before)
})

test('new dates are merged, sorted and persisted data can be exported and restored again', () => {
  const current = { sessions: [{ id: '2026-09-03', date: '2026-09-03', exercises: [] }], exercises: DEFAULT_EXERCISES }
  const result = planWorkoutImport(current, parseWorkoutMarkdown(buildMarkdown(sessions, exercises)))
  assert.equal(result.addedCount, 1)
  assert.equal(result.exerciseCount, 1)
  assert.deepEqual(result.sessions.map(session => session.date), ['2026-09-03', '2026-09-02'])
  assert.deepEqual(parseWorkoutMarkdown(buildMarkdown(result.sessions, result.exercises)).sessions, result.sessions)
  assert.equal(planWorkoutImport(result, parseWorkoutMarkdown(buildMarkdown(sessions, exercises))).addedCount, 0)
})

test('exercise ID collisions are remapped without changing existing definitions', () => {
  const current = { sessions: [], exercises: [{ ...exercises[2], name: 'Existing Bike' }] }
  const incoming = parseWorkoutMarkdown(buildMarkdown(sessions, exercises))
  const result = planWorkoutImport(current, incoming)
  const importedId = result.sessions[0].exercises[2].exerciseId
  assert.notEqual(importedId, exercises[2].id)
  assert.equal(result.exercises.find(ex => ex.id === importedId).name, 'Indoor Bike')
  assert.equal(result.exercises[0].name, 'Existing Bike')
  assert.deepEqual(planWorkoutImport(current, incoming), result)
})

test('truncated, invalid and inconsistent legacy files are rejected as a whole', () => {
  const content = legacy(buildMarkdown(sessions, exercises))
  for (const malformed of [
    '', '# unrelated markdown', content.replace('2026-09-02', '2026-02-30'),
    content.replace('Total sessions: 1', 'Total sessions: 2'),
    content.replace('3 exercises', '4 exercises'), content.replace('42.5kg', 'brokenkg'),
    content.slice(0, content.indexOf('### Pull-up')),
    content + content.slice(content.indexOf('## 2026')),
  ]) assert.throws(() => parseWorkoutMarkdown(malformed))
})

test('corrupt structured backups do not fall back to a lossy legacy import', () => {
  const data = { version: 1, exercises, sessions }
  for (const invalid of [
    { ...data, version: 2 }, { ...data, sessions: [...sessions, ...sessions] },
    { ...data, sessions: [{ ...sessions[0], date: '2026-02-30' }] },
    { ...data, exercises: [{ ...exercises[0], type: 'invalid' }] },
    { ...data, exercises: [...exercises, exercises[0]] },
    { ...data, sessions: [{ ...sessions[0], exercises: [{ exerciseId: 'bench-press', sets: [{ reps: '8' }] }] }] },
  ]) assert.throws(() => parseWorkoutMarkdown(rawBackup(invalid)))
  const content = buildMarkdown(sessions, exercises)
  assert.throws(() => parseWorkoutMarkdown(content.replace('\n-->', '')))
  assert.throws(() => parseWorkoutMarkdown(content.replace('"version":1', '"version":')))
})

test('exercise names containing comment delimiters remain readable and restore correctly', () => {
  const unusual = exercises.map(ex => ({ ...ex, name: '<!-- 이름 --> <script> & ```' }))
  assert.deepEqual(parseWorkoutMarkdown(buildMarkdown(sessions, unusual)).exercises, unusual)
})
