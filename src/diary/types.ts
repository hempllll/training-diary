/**
 * The diary's data model. Everything is plain JSON so it can be stored in
 * localStorage and exported/imported as a backup file unchanged.
 *
 * Units: weights in kg, dates as local `YYYY-MM-DD` strings.
 */

/** Something you train, e.g. "Bench press". Created by the user. */
export interface Exercise {
  id: string
  name: string
}

/** A planned workout, e.g. "Push": an ordered list of exercises. */
export interface TrainingDay {
  id: string
  name: string
  /** Exercise ids in the order they are trained. */
  exerciseIds: string[]
}

/** One set: `reps` repetitions at `weight` kg (0 kg = bodyweight). */
export interface SetEntry {
  weight: number
  reps: number
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
