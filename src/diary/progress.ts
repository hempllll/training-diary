/** Per-exercise progress over time, derived from recorded workouts. */
import { sortWorkouts } from './diary'
import type { SetEntry, Workout } from './types'

export type Metric = 'top' | 'e1rm' | 'volume'

export const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'top', label: 'Top weight', unit: 'kg' },
  { id: 'e1rm', label: 'Est. 1RM', unit: 'kg' },
  { id: 'volume', label: 'Volume', unit: 'kg' },
]

/** One workout's numbers for one exercise. */
export interface ProgressPoint {
  workoutId: string
  date: string
  dayName: string
  sets: SetEntry[]
  /** Heaviest weight lifted (kg). */
  top: number
  /** Best estimated one-rep max over all sets (Epley formula, kg). */
  e1rm: number
  /** Total weight moved: sum of weight × reps (kg). */
  volume: number
}

/** Epley estimate of the one-rep max: weight × (1 + reps / 30). */
export function epley(set: SetEntry): number {
  if (set.reps <= 0) return 0
  return set.reps === 1 ? set.weight : set.weight * (1 + set.reps / 30)
}

/** Progress points for an exercise, oldest first (the order a chart reads). */
export function progressFor(workouts: Workout[], exerciseId: string): ProgressPoint[] {
  const points: ProgressPoint[] = []
  for (const w of sortWorkouts(workouts).reverse()) {
    const sets = w.entries
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
    if (sets.length === 0) continue
    points.push({
      workoutId: w.id,
      date: w.date,
      dayName: w.dayName,
      sets,
      top: Math.max(...sets.map((s) => s.weight)),
      e1rm: Math.max(...sets.map(epley)),
      volume: sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    })
  }
  return points
}
