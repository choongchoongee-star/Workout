import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeLanguage } from './appLanguage.js'
import { getLanguage, resolveLanguage, setLanguage, t } from './i18n.js'
import { localizedMovementName } from './exerciseLabels.js'
import { DEFAULT_EXERCISES } from '../data/exercises.js'
import { formatDate } from './dateUtils.js'
import { buildMarkdown } from './exportUtils.js'
import { parseWorkoutMarkdown } from './importUtils.js'
import { ko } from './translations.js'

test('iOS app language overrides the phone/browser preference; unsupported languages fall back', async () => {
  assert.equal(await initializeLanguage({ native: true, bridge: { getLanguage: async () => ({ language: 'ko-KR' }) }, preferences: ['en-US'] }), 'ko')
  assert.equal(t('Workout'), '운동')
  assert.equal(await initializeLanguage({ native: true, bridge: { getLanguage: async () => ({ language: 'en' }) }, preferences: ['ko'] }), 'en')
  assert.equal(resolveLanguage(['fr', 'ko-KR', 'en']), 'ko')
  assert.equal(resolveLanguage(['ja']), 'en')
  assert.equal(await initializeLanguage({ native: true, bridge: { getLanguage: async () => { throw new Error('old binary') } }, preferences: ['ko'] }), 'ko')
  setLanguage('en')
})

test('localized display leaves custom names, canonical records, equipment and backups unchanged', () => {
  const exercise = DEFAULT_EXERCISES.find(e => e.id === 'bench-press')
  const sessions = [{ id: '2026-09-08', date: '2026-09-08', exercises: [
    { exerciseId: exercise.id, equipment: 'barbell', sets: [{ weight: 45, reps: 8, done: true }] },
    { exerciseId: exercise.id, equipment: 'smith', sets: [{ weight: 30, reps: 10, done: false }] },
  ] }]
  const original = structuredClone(sessions)
  const english = buildMarkdown(sessions, [exercise])
  setLanguage('ko')
  assert.equal(localizedMovementName(exercise), '벤치프레스')
  assert.equal(localizedMovementName({ ...exercise, name: 'My press' }), 'My press')
  assert.equal(t('Barbell'), '바벨')
  assert.equal(buildMarkdown(sessions, [exercise]), english)
  assert.deepEqual(parseWorkoutMarkdown(english).sessions, original)
  assert.deepEqual(sessions, original)
  assert.match(formatDate('2026-09-08', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }), /9월.*화/)
  assert.equal(t('Set {number}', { number: 5 }), '5세트')
  setLanguage('en')
  assert.equal(getLanguage(), 'en')
  assert.equal(localizedMovementName(exercise), 'Bench Press')
})

test('every translation preserves interpolation placeholders', () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
  for (const [key, value] of Object.entries(ko)) {
    assert.deepEqual(placeholders(value), placeholders(key), key)
  }
})
