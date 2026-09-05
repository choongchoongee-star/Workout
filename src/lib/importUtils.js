import { EQUIPMENT_LABELS } from './equipment.js'
import { DEFAULT_EXERCISES } from '../data/exercises.js'
import { normalizeCategory, normalizeExercise } from './exerciseLibrary.js'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024

const numberPattern = '(?:\\d+(?:\\.\\d+)?|\\?)'
const weightPattern = new RegExp(`^(${numberPattern})kg × (${numberPattern})(?:회| reps)$`)
const bodyweightPattern = new RegExp(`^(?:체중|Bodyweight)(?:\\+(-?${numberPattern})kg)? × (${numberPattern})(?:회| reps)$`)
const cardioFields = [
  ['duration_min', /^(\d+(?:\.\d+)?)(?:분| min)$/],
  ['distance_km', /^(\d+(?:\.\d+)?)km$/],
  ['speed_kmh', /^(\d+(?:\.\d+)?)km\/h$/],
  ['incline_pct', /^(?:경사|Incline) (-?\d+(?:\.\d+)?)%$/],
  ['calories', /^(-?\d+(?:\.\d+)?)kcal$/],
]

function requireValue(condition, message = 'Invalid backup data format.') {
  if (!condition) throw new Error(message)
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function copyNumbers(source, keys) {
  const result = {}
  for (const key of keys) {
    if (!(key in source)) continue
    const value = source[key]
    requireValue(value === null || (typeof value === 'number' && Number.isFinite(value)))
    result[key] = value
  }
  return result
}

function validateBackup(data) {
  requireValue(isObject(data) && data.version === 1, 'Unsupported backup version.')
  requireValue(Array.isArray(data.exercises) && Array.isArray(data.sessions))
  const ids = new Set()
  const exercises = data.exercises.map(ex => {
    requireValue(isObject(ex) && isText(ex.id) && isText(ex.name) &&
      typeof ex.category === 'string' && ['weight', 'bodyweight', 'cardio'].includes(ex.type))
    requireValue(!ids.has(ex.id), 'The backup contains duplicate exercise IDs.')
    ids.add(ex.id)
    return normalizeExercise({ id: ex.id, name: ex.name, category: ex.category, type: ex.type, ...copyNumbers(ex, ['met']) })
  })
  const dates = new Set()
  const sessions = data.sessions.map(session => {
    requireValue(isObject(session) && isDate(session.date) && session.id === session.date && Array.isArray(session.exercises))
    requireValue(!dates.has(session.date), 'The file contains multiple workouts for the same date.')
    dates.add(session.date)
    return {
      id: session.id, date: session.date, ...copyNumbers(session, ['duration_min']),
      exercises: session.exercises.map(ex => {
        requireValue(isObject(ex) && isText(ex.exerciseId) && Array.isArray(ex.sets))
        requireValue(ex.equipment === undefined || (typeof ex.equipment === 'string' && Object.hasOwn(EQUIPMENT_LABELS, ex.equipment)), 'Invalid exercise equipment.')
        return {
          exerciseId: ex.exerciseId,
          ...(ex.equipment === undefined ? {} : { equipment: ex.equipment }),
          sets: ex.sets.map(set => {
            requireValue(isObject(set) && (set.done === undefined || typeof set.done === 'boolean'))
            return {
              ...copyNumbers(set, ['weight', 'reps', 'added_weight', ...cardioFields.map(([key]) => key)]),
              ...(set.done === undefined ? {} : { done: set.done }),
            }
          }),
        }
      }),
    }
  })
  return { exercises, sessions, warnings: [] }
}

function parseSet(line) {
  const numeric = value => {
    if (value === '?') return null
    const number = Number(value)
    requireValue(Number.isFinite(number), 'A set contains an invalid number.')
    return number
  }
  let match = line.match(/^\d+\. (.+)$/)
  if (match) {
    const body = match[1].match(bodyweightPattern)
    if (body) return { type: 'bodyweight', set: { added_weight: body[1] ? numeric(body[1]) : 0, reps: numeric(body[2]), done: false } }
    const weight = match[1].match(weightPattern)
    if (weight) return { type: 'weight', set: { weight: numeric(weight[1]), reps: numeric(weight[2]), done: false } }
    throw new Error(`Unrecognized set format: ${line.slice(0, 100)}`)
  }
  match = line.match(/^- (.+)$/)
  requireValue(match, `Unrecognized record format: ${line.slice(0, 100)}`)
  const set = Object.fromEntries(cardioFields.map(([key]) => [key, null]))
  if (match[1] === '-') return { type: 'cardio', set }
  const seen = new Set()
  for (const part of match[1].split(' · ')) {
    const field = cardioFields.find(([, regex]) => regex.test(part))
    requireValue(field && !seen.has(field[0]), `Unrecognized cardio record: ${part.slice(0, 100)}`)
    seen.add(field[0])
    set[field[0]] = Number(part.match(field[1])[1])
    requireValue(Number.isFinite(set[field[0]]))
  }
  return { type: 'cardio', set }
}

function parseLegacyMarkdown(text, knownExercises) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  requireValue(['# 운동 기록', '# Workout history'].includes(lines[0]), 'Choose a workout .md file exported by this app.')
  let index = 1
  if (/^- (?:내보낸 날짜|Exported on): /.test(lines[index])) index++
  const count = lines[index++]?.match(/^- (?:총 세션 수|Total sessions): (\d+)$/)
  requireValue(count, 'Could not read the total session count.')
  const sessions = []
  const exercises = []
  const dates = new Set()
  const known = [...knownExercises.map(normalizeExercise), ...DEFAULT_EXERCISES]
  while (index < lines.length) {
    if (['_기록이 없습니다._', '_No workouts._'].includes(lines[index]) && Number(count[1]) === 0 && index === lines.length - 1) break
    const dateLine = lines[index++]
    const heading = dateLine?.match(/^## (\d{4})-(\d{2})-(\d{2})$/) ??
      dateLine?.match(/^## (\d{4})년 (\d{1,2})월 (\d{1,2})일(?: [월화수목금토일]요일)?$/)
    requireValue(heading, 'Unrecognized workout date format.')
    const date = `${heading[1]}-${heading[2].padStart(2, '0')}-${heading[3].padStart(2, '0')}`
    requireValue(isDate(date), `Invalid date: ${date}`)
    requireValue(!dates.has(date), 'The file contains multiple workouts for the same date.')
    dates.add(date)
    const metaLine = lines[index++]
    const meta = metaLine?.match(/^_(?:Total (\d+(?:\.\d+)?) min · )?(\d+) exercises_$/) ??
      metaLine?.match(/^_(?:총 (\d+(?:\.\d+)?)분 · )?(\d+)종목_$/)
    requireValue(meta, `${date}: Could not read the exercise count and duration.`)
    const session = { id: date, date, duration_min: meta[1] ? Number(meta[1]) : null, exercises: [] }
    if (Number(meta[2]) === 0) {
      requireValue(['- _기록된 운동 없음_', '- _No exercises recorded_'].includes(lines[index++]), `${date}: Invalid empty workout format.`)
    }
    while (lines[index]?.startsWith('### ')) {
      const title = lines[index++].match(/^### (.+?)(?: _\((.*)\)_)?$/)
      requireValue(title, `${date}: Could not read the exercise name.`)
      const [, rawName, rawCategory] = title
      const category = normalizeCategory(rawCategory)
      let equipment
      if (lines[index]?.startsWith('- Equipment: ')) {
        const label = lines[index++].slice('- Equipment: '.length)
        equipment = Object.keys(EQUIPMENT_LABELS).find(key => EQUIPMENT_LABELS[key] === label)
        requireValue(equipment, 'Invalid exercise equipment.')
      }
      const sets = []
      let type
      if (['- _세트 없음_', '- _No sets_'].includes(lines[index])) index++
      else {
        while (index < lines.length && !lines[index].startsWith('## ') && !lines[index].startsWith('### ')) {
          const parsed = parseSet(lines[index++])
          requireValue(!type || type === parsed.type, `${rawName}: Inconsistent exercise types within a set list.`)
          type = parsed.type
          sets.push(parsed.set)
        }
        requireValue(sets.length, `${rawName}: Missing set records.`)
      }
      const nameForType = candidateType => normalizeExercise({ name: rawName, category, type: candidateType }).name
      const existing = [...exercises, ...known].find(ex =>
        (ex.name === nameForType(type ?? ex.type) || ex.id === rawName) && (!category || ex.category === category) && (!type || ex.type === type))
      type ??= existing?.type
      requireValue(type, `${rawName}: Cannot determine the exercise type without sets. Add this exercise to your library first.`)
      const exercise = existing ?? { id: `custom-${crypto.randomUUID()}`, name: nameForType(type), category: category || 'Other', type }
      if (!exercises.some(ex => ex.id === exercise.id)) exercises.push(exercise)
      session.exercises.push({ exerciseId: exercise.id, ...(equipment ? { equipment } : {}), sets })
    }
    requireValue(session.exercises.length === Number(meta[2]), `${date}: The exercise count does not match the records.`)
    sessions.push(session)
  }
  requireValue(sessions.length === Number(count[1]), 'The session count does not match the records. The file may be incomplete.')
  return {
    exercises, sessions,
    warnings: ['This file has no detailed backup data. Sets will be marked incomplete. Information absent from the file, such as custom exercise MET values, cannot be restored.'],
  }
}

export function parseWorkoutMarkdown(content, knownExercises = []) {
  requireValue(typeof content === 'string' && content.trim(), 'The file is empty.')
  requireValue(new TextEncoder().encode(content).length <= MAX_IMPORT_BYTES, 'Choose a file smaller than 10 MB.')
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  if (text.includes('<!-- workout-backup:')) {
    const blocks = [...text.matchAll(/<!-- workout-backup:v(\d+)\n([^]*?)\n-->/g)]
    requireValue(blocks.length === 1 && blocks[0][1] === '1', 'The backup is damaged or uses an unsupported version.')
    let data
    try { data = JSON.parse(blocks[0][2]) } catch { throw new Error('The backup is damaged. Please select the original file.') }
    return validateBackup(data)
  }
  return parseLegacyMarkdown(text, knownExercises)
}

// The app has one session per date. Preserve existing days and add only missing ones.
export function planWorkoutImport(current, incoming) {
  const dates = new Set(current.sessions.map(session => session.date))
  const sessionsToAdd = incoming.sessions.filter(session => !dates.has(session.date))
  const needed = new Set(sessionsToAdd.flatMap(session => session.exercises.map(ex => ex.exerciseId)))
  const exercises = [...current.exercises]
  const mapping = new Map()
  for (const source of incoming.exercises) {
    if (!needed.has(source.id)) continue
    const matches = ex => ex.name === source.name && ex.category === source.category && ex.type === source.type &&
      (ex.type !== 'cardio' || (ex.met ?? null) === (source.met ?? null))
    const existing = exercises.find(ex => ex.id === source.id && matches(ex)) ?? exercises.find(matches)
    if (existing) mapping.set(source.id, existing.id)
    else {
      let id = source.id
      let suffix = 1
      while (exercises.some(ex => ex.id === id)) id = `custom-import-${source.id}-${suffix++}`
      exercises.push({ ...source, id })
      mapping.set(source.id, id)
    }
  }
  const added = sessionsToAdd.map(session => ({
    ...session,
    exercises: session.exercises.map(ex => ({ ...ex, exerciseId: mapping.get(ex.exerciseId) ?? ex.exerciseId })),
  }))
  return {
    exercises,
    sessions: [...current.sessions, ...added].sort((a, b) => b.date.localeCompare(a.date)),
    addedCount: added.length,
    skippedCount: incoming.sessions.length - added.length,
    exerciseCount: exercises.length - current.exercises.length,
  }
}
