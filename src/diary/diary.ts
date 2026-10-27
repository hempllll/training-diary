/**
 * Pure operations on the diary. Each returns a new `Diary` and never mutates
 * its input, so React state updates stay simple and everything is testable
 * without a UI or storage.
 */
import type { Diary, Exercise, TrainingDay, Workout } from './types'

export const emptyDiary = (): Diary => ({ exercises: [], days: [], workouts: [] })

export const newId = (): string => crypto.randomUUID()

/**
 * Why `name` can't be used for an item in `existing`, or null if it can.
 * Names must be non-empty and unique (ignoring case); `selfId` is the item
 * being renamed, which may keep its own name.
 */
export function nameError(
  name: string,
  existing: { id: string; name: string }[],
  selfId?: string,
): string | null {
  const trimmed = name.trim()
  if (trimmed === '') return 'Enter a name.'
  const key = trimmed.toLowerCase()
  const clash = existing.find((e) => e.id !== selfId && e.name.trim().toLowerCase() === key)
  return clash ? `"${clash.name}" already exists.` : null
}

/** Insert or replace (by id) an item in a list, keeping its position. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

// --- exercises -------------------------------------------------------------

export function saveExercise(diary: Diary, exercise: Exercise): Diary {
  return { ...diary, exercises: upsert(diary.exercises, { ...exercise, name: exercise.name.trim() }) }
}

/**
 * Delete an exercise and take it out of every training day. Recorded workouts
 * keep their entries (with the name snapshot), so history isn't lost.
 */
export function deleteExercise(diary: Diary, id: string): Diary {
  return {
    ...diary,
    exercises: diary.exercises.filter((e) => e.id !== id),
    days: diary.days.map((d) =>
      d.exerciseIds.includes(id) ? { ...d, exerciseIds: d.exerciseIds.filter((x) => x !== id) } : d,
    ),
  }
}

/** Exercises sorted by name, for lists and pickers. */
export function sortedExercises(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name))
}

// --- training days ---------------------------------------------------------

export function saveDay(diary: Diary, day: TrainingDay): Diary {
  return { ...diary, days: upsert(diary.days, { ...day, name: day.name.trim() }) }
}

/** Delete a training day. Its recorded workouts stay (with the name snapshot). */
export function deleteDay(diary: Diary, id: string): Diary {
  return { ...diary, days: diary.days.filter((d) => d.id !== id) }
}

/** Move the item at `from` to position `to` (both clamped to the list). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(list.length - 1, to))
  if (from < 0 || from >= list.length || from === target) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

// --- workouts --------------------------------------------------------------

export function saveWorkout(diary: Diary, workout: Workout): Diary {
  return { ...diary, workouts: upsert(diary.workouts, workout) }
}

export function deleteWorkout(diary: Diary, id: string): Diary {
  return { ...diary, workouts: diary.workouts.filter((w) => w.id !== id) }
}

/** Newest first: by date, then by start time for workouts on the same date. */
export function sortWorkouts(workouts: Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
  )
}

/**
 * Workouts newest first, keeping only those of the given training days.
 * An empty filter means "all days".
 */
export function recentWorkouts(workouts: Workout[], dayIds: ReadonlySet<string>): Workout[] {
  const shown = dayIds.size === 0 ? workouts : workouts.filter((w) => dayIds.has(w.dayId))
  return sortWorkouts(shown)
}

/**
 * The training days to offer as home-screen filters: every current day, plus
 * days that were deleted but still have workouts (under their last-used name).
 */
export function dayFilters(diary: Diary): { id: string; name: string }[] {
  const filters = diary.days.map((d) => ({ id: d.id, name: d.name }))
  const known = new Set(filters.map((f) => f.id))
  for (const w of sortWorkouts(diary.workouts)) {
    if (!known.has(w.dayId)) {
      known.add(w.dayId)
      filters.push({ id: w.dayId, name: w.dayName })
    }
  }
  return filters
}
