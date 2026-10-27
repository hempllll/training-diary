/**
 * JSON export/import of the whole diary (the backup path: an installed iOS PWA
 * has its own storage, and clearing it would lose everything).
 *
 * Export wraps the diary with a format tag and version so files stay
 * recognisable and upgradeable. Import validates untrusted file contents by
 * hand (no schema library) and throws a clear error on the first problem, so a
 * bad file can never corrupt the store.
 */
import type { Diary, SetEntry, TrainingDay, Workout, WorkoutEntry } from '../diary'

const FORMAT = 'training-diary/diary'
const VERSION = 1

interface DiaryFile extends Diary {
  format: typeof FORMAT
  version: number
}

/** Serialise the diary to a pretty-printed JSON string for download. */
export function exportDiary(diary: Diary): string {
  const file: DiaryFile = { format: FORMAT, version: VERSION, ...diary }
  return JSON.stringify(file, null, 2)
}

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message)
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

function array(value: unknown, where: string): unknown[] {
  return Array.isArray(value) ? value : fail(`${where} must be an array`)
}

function object(value: unknown, where: string): Record<string, unknown> {
  return isObject(value) ? value : fail(`${where} must be an object`)
}

function string(o: Record<string, unknown>, key: string, where: string): void {
  if (!isNonEmptyString(o[key])) fail(`${where}.${key} must be a non-empty string`)
}

function validateSet(value: unknown, where: string): SetEntry {
  const s = object(value, where)
  if (typeof s.weight !== 'number' || !Number.isFinite(s.weight) || s.weight < 0) {
    fail(`${where}.weight must be a number >= 0`)
  }
  if (typeof s.reps !== 'number' || !Number.isInteger(s.reps) || s.reps < 0) {
    fail(`${where}.reps must be a whole number >= 0`)
  }
  return { weight: s.weight, reps: s.reps }
}

function validateEntry(value: unknown, where: string): WorkoutEntry {
  const e = object(value, where)
  string(e, 'exerciseId', where)
  string(e, 'exerciseName', where)
  array(e.sets, `${where}.sets`).forEach((s, i) => validateSet(s, `${where}.sets[${i}]`))
  if (e.replaces !== undefined) {
    const r = object(e.replaces, `${where}.replaces`)
    string(r, 'exerciseId', `${where}.replaces`)
    string(r, 'exerciseName', `${where}.replaces`)
  }
  if (e.extra !== undefined && typeof e.extra !== 'boolean') fail(`${where}.extra must be true or false`)
  return value as unknown as WorkoutEntry
}

function validateWorkout(value: unknown, where: string): Workout {
  const w = object(value, where)
  for (const key of ['id', 'dayId', 'dayName', 'startedAt']) string(w, key, where)
  if (!isDate(w.date)) fail(`${where}.date must be a YYYY-MM-DD date`)
  array(w.entries, `${where}.entries`).forEach((e, i) => validateEntry(e, `${where}.entries[${i}]`))
  return value as unknown as Workout
}

function validateDay(value: unknown, where: string): TrainingDay {
  const d = object(value, where)
  string(d, 'id', where)
  string(d, 'name', where)
  if (!array(d.exerciseIds, `${where}.exerciseIds`).every(isNonEmptyString)) {
    fail(`${where}.exerciseIds must contain exercise ids`)
  }
  return value as unknown as TrainingDay
}

function uniqueIds(items: { id: string }[], where: string): void {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.id)) fail(`${where}[${i}].id is used twice`)
    seen.add(item.id)
  })
}

/**
 * Parse and validate a diary JSON document (an exported file or the stored
 * copy). Throws with a descriptive message on any problem.
 */
export function parseDiary(text: string): Diary {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    fail('File is not valid JSON')
  }
  const root = object(parsed, 'The file')
  if (root.format !== undefined && root.format !== FORMAT) fail('This is not a training diary backup')

  const exercises = array(root.exercises, 'exercises').map((value, i) => {
    const e = object(value, `exercises[${i}]`)
    string(e, 'id', `exercises[${i}]`)
    string(e, 'name', `exercises[${i}]`)
    return { id: e.id as string, name: e.name as string }
  })
  const days = array(root.days, 'days').map((d, i) => validateDay(d, `days[${i}]`))
  const workouts = array(root.workouts, 'workouts').map((w, i) => validateWorkout(w, `workouts[${i}]`))

  uniqueIds(exercises, 'exercises')
  uniqueIds(days, 'days')
  uniqueIds(workouts, 'workouts')

  return { exercises, days, workouts }
}
