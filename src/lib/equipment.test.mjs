import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES as exercises } from '../data/exercises.js'
import { changeCardEquipment, defaultEquipment, equipmentOptions, equipmentRecords, exerciseChoices, familyId, movementName, previousEquipmentSet, recordEquipment } from './equipment.js'
import { buildMarkdown } from './exportUtils.js'
import { parseWorkoutMarkdown, planWorkoutImport } from './importUtils.js'
import { parseLocalWorkoutData } from './localWorkoutData.js'

const bench = exercises.find(e => e.id === 'bench-press')
const incline = exercises.find(e => e.id === 'incline-bench')
const inclineDb = exercises.find(e => e.id === 'incline-dumbbell-press')
const set = weight => ({ weight, reps: 10, done: false })
const card = (equipment, weight, exerciseId = bench.id) => ({ exerciseId, equipment, sets: [set(weight)] })
const sessions = [{ id: '2026-09-04', date: '2026-09-04', exercises: [card('barbell', 60), card('smith', 40), card('barbell', 65)] },
  { id: '2026-09-03', date: '2026-09-03', exercises: [card('smith', 35)] }]

test('equipment changes preserve populated and duplicate cards, replacing only empty cards', () => {
  const cards = [card('barbell', 60), card('barbell', 70)]
  const before = structuredClone(cards)
  const switched = changeCardEquipment(cards, 0, bench, 'smith')
  assert.deepEqual(cards, before)
  assert.deepEqual(switched.slice(0, 2), before)
  assert.deepEqual(switched[2], { exerciseId: bench.id, equipment: 'smith', sets: [] })
  const emptySwitched = changeCardEquipment(switched, 2, bench, 'dumbbell')
  assert.equal(emptySwitched.length, 3)
  assert.equal(emptySwitched[2].equipment, 'dumbbell')
  assert.equal(changeCardEquipment(cards, 1, bench, 'barbell'), cards)
  assert.equal(changeCardEquipment(cards, 1, bench, 'machine'), cards)
})

test('progress includes every duplicate card and previous sets use the last matching card, never another equipment', () => {
  assert.equal(equipmentRecords(sessions, exercises, bench, 'barbell').length, 2)
  assert.equal(equipmentRecords(sessions, exercises, bench, 'smith').length, 2)
  assert.equal(previousEquipmentSet(sessions, exercises, bench, 'barbell', '2026-09-05').weight, 65)
  assert.equal(previousEquipmentSet(sessions, exercises, bench, 'smith', '2026-09-04').weight, 35)
  assert.equal(previousEquipmentSet(sessions, exercises, bench, 'dumbbell', '2026-09-05'), null)
})

test('defaults honor last selection then recent cards, ignoring unsupported and unspecified equipment', () => {
  assert.equal(defaultEquipment(bench, sessions, exercises, 'smith'), 'smith')
  assert.equal(defaultEquipment(bench, sessions, exercises, 'machine'), 'barbell')
  assert.equal(defaultEquipment(bench, [], exercises), 'barbell')
  assert.equal(defaultEquipment(exercises.find(e => e.id === 'plank'), sessions, exercises), null)
})

test('legacy unknown equipment stays separate; explicit dumbbell aliases share one movement', () => {
  const old = { exerciseId: bench.id, sets: [set(100)] }
  assert.equal(recordEquipment(old, bench), 'unspecified')
  const unknown = [{ date: '2026-09-01', exercises: [old] }]
  assert.equal(previousEquipmentSet(unknown, exercises, bench, 'barbell', '2026-09-05'), null)
  assert.equal(equipmentRecords(unknown, exercises, bench, 'unspecified')[0].sets[0].weight, 100)
  assert.equal(recordEquipment({ exerciseId: inclineDb.id }, inclineDb), 'dumbbell')
  assert.equal(familyId(incline), familyId(inclineDb))
  assert.equal(exerciseChoices(exercises).filter(e => familyId(e) === incline.id).length, 1)
  assert.equal(exerciseChoices([inclineDb, incline])[0].id, incline.id)
  assert.equal(movementName(inclineDb), 'Incline Bench Press')
  const oldDb = [{ date: '2026-09-01', exercises: [{ exerciseId: inclineDb.id, sets: [set(25)] }] }]
  assert.equal(previousEquipmentSet(oldDb, exercises, incline, 'dumbbell', '2026-09-05').weight, 25)
})

test('custom names and promoted legacy IDs retain identity', () => {
  const promoted = { ...inclineDb, id: 'custom-old' }
  assert.equal(familyId(promoted), incline.id)
  assert.equal(recordEquipment({}, promoted), 'dumbbell')
  const custom = { ...bench, name: 'My bench variation' }
  assert.equal(movementName(custom), custom.name)
  assert.deepEqual(equipmentOptions(custom), [])
})

test('local and Markdown backup restore retain equipment and duplicate cards', () => {
  const local = parseLocalWorkoutData(JSON.stringify({ version: 1, exercises, sessions }))
  assert.deepEqual(local.sessions, sessions)
  const markdown = buildMarkdown(sessions, exercises)
  const restored = parseWorkoutMarkdown(markdown)
  assert.deepEqual(restored.sessions, sessions)
  assert.deepEqual(planWorkoutImport({ exercises, sessions: [] }, restored).sessions, sessions)
  const readable = parseWorkoutMarkdown(markdown.replace(/<!-- workout-backup:v1\n[^]*?\n-->\n/, ''))
  assert.deepEqual(readable.sessions[0].exercises, sessions[0].exercises)
  assert.throws(() => parseWorkoutMarkdown(markdown.replace('"equipment":"barbell"', '"equipment":"invalid"')), /equipment/)
  assert.throws(() => parseWorkoutMarkdown(markdown.replace('"equipment":"barbell"', '"equipment":["barbell"]')), /equipment/)
})
