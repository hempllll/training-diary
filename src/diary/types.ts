/**
 * The diary's data model. Everything is plain JSON so it can be stored in
 * localStorage and exported/imported as a backup file unchanged.
 *
 * Units: weights in kg, dates as local `YYYY-MM-DD` strings.
 *
 * In the UI a `TrainingDay` is called a "plan" and a `Workout` a "training
 * day" (what the user tracks); the code keeps its original names.
 *
 * Users have real data stored: new fields must be optional (or filled in by a
 * migration in storage/diaryIO.ts), and every format version needs a fixture
 * in storage/__tests__/fixtures (see compatibility.test.ts).
 */

/** Something you train, e.g. "Bench press". Created by the user. */
export interface Exercise {
  id: string
  name: string
  /** Free-text notes, e.g. machine settings. Missing in data from v1. */
  description?: string
}

/**
 * A planned workout, e.g. "Push": an ordered list of exercises. A plan with
 * no exercises is a rest day.
 */
export interface TrainingDay {
  id: string
  name: string
  /** Exercise ids in the order they are trained; empty for a rest day. */
  exerciseIds: string[]
}

/** One set: `reps` repetitions at `weight` kg (0 kg = bodyweight). */
export interface SetEntry {
  weight: number
  reps: number
  /** Done to failure (no further rep possible). Only stored when true; missing before v4. */
  failure?: boolean
}

/** What was done for one exercise during a workout. */
export interface WorkoutEntry {
  exerciseId: string
  /** Name at the time of the workout, so history survives renames and deletes. */
  exerciseName: string
  sets: SetEntry[]
  /** The planned exercise this one stood in for (machine broken, taken, …). */
  replaces?: { exerciseId: string; exerciseName: string }
  /** Added during the workout; not part of the training day's plan. */
  extra?: boolean
}

/** A recorded (or in-progress) training session. */
export interface Workout {
  id: string
  dayId: string
  /** Training day name at the time of the workout. */
  dayName: string
  /** Local date the workout counts for (`YYYY-MM-DD`). */
  date: string
  /** ISO timestamp the workout was started; orders workouts on the same date. */
  startedAt: string
  /** The user's body weight that day (kg), if entered. Missing in data from v1. */
  bodyWeight?: number
  /** Free-text notes about the day. Missing in data before v3. */
  description?: string
  entries: WorkoutEntry[]
}

/** The whole stored diary. */
export interface Diary {
  exercises: Exercise[]
  days: TrainingDay[]
  workouts: Workout[]
}

/**
 * A workout being logged, plus which exercise is on screen. Persisted on its
 * own so closing the app mid-workout loses nothing.
 */
export interface ActiveWorkout {
  workout: Workout
  /** Index into `workout.entries` of the exercise being logged. */
  current: number
  /** True when re-opening an already saved workout to correct it. */
  editing?: boolean
}
