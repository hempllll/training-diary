import { describe, expect, it } from 'vitest'
import { epley, progressFor, type Workout } from '..'

const w = (id: string, date: string, sets: [number, number][]): Workout => ({
  id,
  dayId: 'push',
  dayName: 'Push',
  date,
  startedAt: `${date}T10:00:00Z`,
  entries: [
    { exerciseId: 'bench', exerciseName: 'Bench', sets: sets.map(([weight, reps]) => ({ weight, reps })) },
    { exerciseId: 'dips', exerciseName: 'Dips', sets: [{ weight: 0, reps: 12 }] },
  ],
})

describe('epley', () => {
  it('estimates the one-rep max', () => {
    expect(epley({ weight: 100, reps: 1 })).toBe(100)
    expect(epley({ weight: 60, reps: 10 })).toBe(80)
    expect(epley({ weight: 60, reps: 0 })).toBe(0)
  })
})

describe('progressFor', () => {
  it('summarises each workout, oldest first', () => {
    const points = progressFor(
      [
        w('b', '2026-10-24', [[65, 8], [60, 10]]),
        w('a', '2026-10-20', [[60, 10], [60, 10]]),
      ],
      'bench',
    )
    expect(points.map((p) => p.workoutId)).toEqual(['a', 'b'])
    expect(points[0]).toMatchObject({ top: 60, e1rm: 80, volume: 1200 })
    expect(points[1].top).toBe(65)
    expect(points[1].volume).toBe(65 * 8 + 600)
  })

  it('skips workouts without the exercise', () => {
    expect(progressFor([w('a', '2026-10-20', [])], 'bench')).toEqual([])
    expect(progressFor([w('a', '2026-10-20', [])], 'squat')).toEqual([])
  })
})
