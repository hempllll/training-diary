/**
 * Logging a workout: start one from a training day, step through its
 * exercises, swap or add exercises for this session only, and finish.
 * Pure functions over `ActiveWorkout`, like the rest of the diary module.
 */
import { newId, sortWorkouts } from './diary'
import type {
  ActiveWorkout,
  Diary,
  Exercise,
  SetEntry,
  TrainingDay,
  Workout,
  WorkoutEntry,
} from './types'

/** Sets for an exercise never done before. */
export const DEFAULT_SETS: SetEntry[] = [
  { weight: 0, reps: 10 },
  { weight: 0, reps: 10 },
  { weight: 0, reps: 10 },
]

/** A Date as a local `YYYY-MM-DD` string (not UTC, unlike toISOString). */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The most recent recorded entry for an exercise (with at least one set), and
 * the workout it belongs to. `excludeId` skips the workout being edited.
 */
export function lastEntry(
  workouts: Workout[],
  exerciseId: string,
  excludeId?: string,
): { workout: Workout; entry: WorkoutEntry } | null {
  for (const workout of sortWorkouts(workouts)) {
    if (workout.id === excludeId) continue
    const entry = workout.entries.find((e) => e.exerciseId === exerciseId && e.sets.length > 0)
    if (entry) return { workout, entry }
  }
  return null
}

/** A fresh entry for an exercise, pre-filled with what was done last time. */
export function newEntry(exercise: Exercise, workouts: Workout[]): WorkoutEntry {
  const last = lastEntry(workouts, exercise.id)
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: (last?.entry.sets ?? DEFAULT_SETS).map((s) => ({ ...s })),
  }
}

/** Start logging a training day, its exercises in the planned order. */
export function startWorkout(day: TrainingDay, diary: Diary, now: Date): ActiveWorkout {
  const byId = new Map(diary.exercises.map((e) => [e.id, e]))
  const entries = day.exerciseIds.flatMap((id) => {
    const exercise = byId.get(id)
    return exercise ? [newEntry(exercise, diary.workouts)] : []
  })
  return {
    workout: {
      id: newId(),
      dayId: day.id,
      dayName: day.name,
      date: localDate(now),
      startedAt: now.toISOString(),
      entries,
    },
    current: 0,
  }
}

/** Re-open a saved workout to correct it. */
export function editWorkout(workout: Workout): ActiveWorkout {
  return { workout: structuredClone(workout), current: 0, editing: true }
}

function withEntries(active: ActiveWorkout, entries: WorkoutEntry[], current: number): ActiveWorkout {
  return {
    ...active,
    workout: { ...active.workout, entries },
    current: Math.max(0, Math.min(entries.length - 1, current)),
  }
}

/** Jump to the exercise at `index`. */
export function goTo(active: ActiveWorkout, index: number): ActiveWorkout {
  return withEntries(active, active.workout.entries, index)
}

/** Replace the sets logged for the exercise at `index`. */
export function updateSets(active: ActiveWorkout, index: number, sets: SetEntry[]): ActiveWorkout {
  const entries = active.workout.entries.map((e, i) => (i === index ? { ...e, sets } : e))
  return withEntries(active, entries, active.current)
}

/**
 * Swap the exercise at `index` for another one, for this workout only. The
 * entry remembers which planned exercise it stands in for; swapping a
 * replacement again still points back at the original plan.
 */
export function replaceEntry(
  active: ActiveWorkout,
  index: number,
  exercise: Exercise,
  workouts: Workout[],
): ActiveWorkout {
  const entries = active.workout.entries.map((old, i) => {
    if (i !== index) return old
    const entry = newEntry(exercise, workouts)
    if (old.extra) entry.extra = true
    const original = old.replaces ?? { exerciseId: old.exerciseId, exerciseName: old.exerciseName }
    if (original.exerciseId !== exercise.id) entry.replaces = original
    return entry
  })
  return withEntries(active, entries, active.current)
}

/** Add an exercise right after `index` (this workout only) and show it. */
export function insertEntry(
  active: ActiveWorkout,
  index: number,
  exercise: Exercise,
  workouts: Workout[],
): ActiveWorkout {
  const entries = [...active.workout.entries]
  entries.splice(index + 1, 0, { ...newEntry(exercise, workouts), extra: true })
  return withEntries(active, entries, index + 1)
}

/** Drop the exercise at `index` from this workout. */
export function removeEntry(active: ActiveWorkout, index: number): ActiveWorkout {
  const entries = active.workout.entries.filter((_, i) => i !== index)
  return withEntries(active, entries, index >= active.current ? active.current : active.current - 1)
}

/**
 * The workout to save: sets with no reps are dropped, and exercises left
 * without any set count as skipped and are dropped too.
 */
export function finishWorkout(active: ActiveWorkout): Workout {
  const entries = active.workout.entries
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) }))
    .filter((e) => e.sets.length > 0)
  return { ...active.workout, entries }
}
