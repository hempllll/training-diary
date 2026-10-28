import { describe, expect, it } from 'vitest'
import {
  addDays,
  averageUpTo,
  bodyWeights,
  epley,
  exerciseChoices,
  exerciseStats,
  inSpan,
  lastTrainedExercise,
  movingAverage,
  plansOverview,
  repsTrend,
  sessionsOf,
  spanStart,
  weekStart,
  weightTrend,
  type Diary,
  type Workout,
} from '..'

const w = (id: string, date: string, bench: [number, number][], extra: Partial<Workout> = {}): Workout => ({
  id,
  dayId: 'push',
  dayName: 'Push',
  date,
  startedAt: `${date}T10:00:00Z`,
  entries: [
    { exerciseId: 'bench', exerciseName: 'Bench', sets: bench.map(([weight, reps]) => ({ weight, reps })) },
    { exerciseId: 'dips', exerciseName: 'Dips', sets: [{ weight: 0, reps: 12 }, { weight: 0, reps: 9 }] },
  ],
  ...extra,
})

describe('dates', () => {
  it('adds days across months and finds the Monday of a week', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(weekStart('2026-10-28')).toBe('2026-10-26') // Wed → Mon
    expect(weekStart('2026-10-26')).toBe('2026-10-26')
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // Sun belongs to the week before
  })

  it('limits items to a time span', () => {
    expect(spanStart('3m', '2026-10-28')).toBe('2026-07-28')
    expect(spanStart('1y', '2026-10-28')).toBe('2025-10-28')
    expect(spanStart('all', '2026-10-28')).toBeNull()
    const items = [{ date: '2026-09-27' }, { date: '2026-09-28' }, { date: '2026-10-28' }]
    expect(inSpan(items, '1m', '2026-10-28')).toEqual(items.slice(1))
    expect(inSpan(items, 'all', '2026-10-28')).toEqual(items)
  })
})

describe('body weight', () => {
  const workouts = [
    w('a', '2026-10-01', [], { bodyWeight: 80 }),
    w('b', '2026-10-05', [], { bodyWeight: 82 }),
    w('c', '2026-10-05', [], { bodyWeight: 81 }), // twice on one day: the mean
    w('d', '2026-10-06', []), // not entered
    w('e', '2026-10-09', [], { bodyWeight: 79 }),
  ]

  it('lists one weigh-in per date, oldest first', () => {
    expect(bodyWeights(workouts)).toEqual([
      { date: '2026-10-01', kg: 80 },
      { date: '2026-10-05', kg: 81.5 },
      { date: '2026-10-09', kg: 79 },
    ])
  })

  it('averages the weigh-ins of the last seven days', () => {
    const weighIns = bodyWeights(workouts)
    // 1 Oct is seven days before 8 Oct, so outside its window.
    expect(averageUpTo(weighIns, '2026-10-07')).toBe((80 + 81.5) / 2)
    expect(averageUpTo(weighIns, '2026-10-08')).toBe(81.5)
    expect(averageUpTo(weighIns, '2026-10-20')).toBeNull()
    expect(movingAverage(weighIns)).toEqual([80, (80 + 81.5) / 2, (81.5 + 79) / 2])
  })
})

describe('exercises', () => {
  const workouts = [
    w('b', '2026-10-24', [[70, 6], [65, 8], [65, 10]]),
    w('a', '2026-10-20', [[60, 10], [60, 12], [50, 15]]),
    { ...w('c', '2026-10-27', []), entries: [] }, // rest day
  ]
  const sessions = sessionsOf(workouts, 'bench')

  it('estimates the one-rep max', () => {
    expect(epley({ weight: 100, reps: 1 })).toBe(100)
    expect(epley({ weight: 60, reps: 10 })).toBe(80)
    expect(epley({ weight: 60, reps: 0 })).toBe(0)
  })

  it('finds the sessions of an exercise, oldest first', () => {
    expect(sessions.map((s) => s.workoutId)).toEqual(['a', 'b'])
    expect(sessionsOf(workouts, 'squat')).toEqual([])
  })

  it('charts the heaviest set inside a rep range', () => {
    expect(weightTrend(sessions, { min: 8, max: 12 }).map((p) => [p.date, p.set])).toEqual([
      ['2026-10-20', { weight: 60, reps: 12 }], // same weight: more reps wins
      ['2026-10-24', { weight: 65, reps: 10 }],
    ])
    expect(weightTrend(sessions, { min: 7, max: 1 }).map((p) => p.set)).toEqual([{ weight: 70, reps: 6 }]) // swapped bounds
    expect(repsTrend(sessionsOf(workouts, 'dips')).map((p) => p.set.reps)).toEqual([12, 12])
  })

  it('sums up all sessions', () => {
    expect(exerciseStats(sessions)).toEqual({
      sessions: 2,
      sets: 6,
      reps: 61,
      volume: 600 + 720 + 750 + 420 + 520 + 650,
      first: '2026-10-20',
      last: '2026-10-24',
      perWeek: 2, // 20 and 24 Oct are in the same week
      heaviest: { set: { weight: 70, reps: 6 }, date: '2026-10-24' },
      bestE1rm: { kg: 65 * (1 + 10 / 30), date: '2026-10-24' },
      bodyweightOnly: false,
    })
    expect(exerciseStats(sessionsOf(workouts, 'dips'))?.bodyweightOnly).toBe(true)
    expect(exerciseStats([])).toBeNull()
  })

  it('offers current exercises and deleted ones with history', () => {
    const diary: Diary = { exercises: [{ id: 'bench', name: 'Bench' }], days: [], workouts }
    expect(exerciseChoices(diary)).toEqual([
      { id: 'bench', name: 'Bench' },
      { id: 'dips', name: 'Dips (deleted)' },
    ])
    expect(lastTrainedExercise(workouts)).toBe('bench')
    expect(lastTrainedExercise([])).toBeNull()
  })
})

describe('plansOverview', () => {
  const pull = (id: string, date: string): Workout => ({ ...w(id, date, [[50, 10]]), dayId: 'pull', dayName: 'Pull' })
  const diary: Diary = {
    exercises: [],
    days: [
      { id: 'push', name: 'Push', exerciseIds: [] },
      { id: 'legs', name: 'Legs', exerciseIds: [] },
    ],
    workouts: [
      w('p1', '2026-10-05', [[60, 10]]), // week of 5 Oct
      w('p2', '2026-10-08', [[60, 10], [60, 8]], {
        entries: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ weight: 10, reps: 10 }], extra: true }],
      }),
      pull('l1', '2026-10-13'), // week of 12 Oct: Pull only
      w('p3', '2026-10-21', [[62.5, 10]]), // week of 19 Oct
      pull('l2', '2026-10-27'), // this week
    ],
  }
  const overview = plansOverview(diary, '2026-10-28')

  it('counts training days per week, over the weeks with any', () => {
    expect(overview).toMatchObject({ total: 5, weeks: 4, perWeek: 5 / 4, thisWeek: 1 })
  })

  it('sums up each plan, including deleted ones that were tracked', () => {
    expect(overview.plans.map((p) => p.name)).toEqual(['Push', 'Legs', 'Pull'])
    const [push, legs, deleted] = overview.plans
    expect(push).toEqual({
      id: 'push',
      name: 'Push',
      count: 3,
      first: '2026-10-05',
      last: '2026-10-21',
      perWeek: 1.5, // 3 times in the 2 weeks it was done
      weeks: 2,
      weeksTracked: 4,
      gapDays: 8,
      // p1 and p3 have one bench and two dips sets, p2 only the extra set.
      sets: (3 + 1 + 3) / 3,
      volume: (600 + 100 + 625) / 3,
      swaps: 1,
    })
    expect(legs).toEqual({ id: 'legs', name: 'Legs', count: 0, weeks: 0, weeksTracked: 0, swaps: 0 })
    expect(deleted).toMatchObject({ name: 'Pull', count: 2, weeksTracked: 3, perWeek: 1 })
  })
})
