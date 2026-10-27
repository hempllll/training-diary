import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETS,
  finishWorkout,
  goTo,
  insertEntry,
  lastEntry,
  localDate,
  removeEntry,
  replaceEntry,
  setBodyWeight,
  setDescription,
  startWorkout,
  updateSets,
  type Diary,
} from '..'

const bench = { id: 'bench', name: 'Bench press' }
const incline = { id: 'incline', name: 'Incline press' }
const dips = { id: 'dips', name: 'Dips' }
const flys = { id: 'flys', name: 'Cable flys' }

const diary: Diary = {
  exercises: [bench, incline, dips, flys],
  days: [{ id: 'push', name: 'Push', exerciseIds: ['bench', 'gone', 'incline', 'dips'] }],
  workouts: [
    {
      id: 'old',
      dayId: 'push',
      dayName: 'Push',
      date: '2026-10-20',
      startedAt: '2026-10-20T17:00:00.000Z',
      entries: [
        { exerciseId: 'bench', exerciseName: 'Bench press', sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }] },
      ],
    },
  ],
}

const NOW = new Date(2026, 9, 27, 18, 30) // Tue 27 Oct 2026, local time
const start = () => startWorkout(diary.days[0], diary, NOW)

describe('localDate', () => {
  it('uses the local calendar date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('startWorkout', () => {
  it('follows the training day order, skipping deleted exercises', () => {
    const active = start()
    expect(active.current).toBe(0)
    expect(active.workout).toMatchObject({ dayId: 'push', dayName: 'Push', date: '2026-10-27' })
    expect(active.workout.entries.map((e) => e.exerciseId)).toEqual(['bench', 'incline', 'dips'])
  })

  it("pre-fills last time's sets, or defaults for a new exercise", () => {
    const [b, i] = start().workout.entries
    expect(b.sets).toEqual([{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }])
    expect(b.sets).not.toBe(diary.workouts[0].entries[0].sets) // a copy
    expect(i.sets).toEqual(DEFAULT_SETS)
  })
})

describe('lastEntry', () => {
  it('finds the newest entry and can skip the workout being edited', () => {
    expect(lastEntry(diary.workouts, 'bench')?.workout.id).toBe('old')
    expect(lastEntry(diary.workouts, 'bench', 'old')).toBeNull()
    expect(lastEntry(diary.workouts, 'dips')).toBeNull()
  })
})

describe('changing the workout', () => {
  it('replaces an exercise for this workout only and remembers the original', () => {
    let active = replaceEntry(start(), 1, flys, diary.workouts)
    expect(active.workout.entries[1]).toMatchObject({
      exerciseId: 'flys',
      replaces: { exerciseId: 'incline', exerciseName: 'Incline press' },
    })
    // Replacing the replacement still points at the planned exercise.
    active = replaceEntry(active, 1, bench, diary.workouts)
    expect(active.workout.entries[1].replaces?.exerciseId).toBe('incline')
    // Swapping back to the planned exercise is no replacement at all.
    active = replaceEntry(active, 1, incline, diary.workouts)
    expect(active.workout.entries[1].replaces).toBeUndefined()
    expect(diary.days[0].exerciseIds).toEqual(['bench', 'gone', 'incline', 'dips'])
  })

  it('inserts an extra exercise after the current one and shows it', () => {
    const active = insertEntry(start(), 0, flys, diary.workouts)
    expect(active.workout.entries.map((e) => e.exerciseId)).toEqual(['bench', 'flys', 'incline', 'dips'])
    expect(active.workout.entries[1].extra).toBe(true)
    expect(active.current).toBe(1)
  })

  it('inserts into an empty workout', () => {
    const empty = removeEntry(removeEntry(removeEntry(start(), 0), 0), 0)
    expect(empty.workout.entries).toEqual([])
    const active = insertEntry(empty, empty.current, flys, diary.workouts)
    expect(active.workout.entries.map((e) => e.exerciseId)).toEqual(['flys'])
    expect(active.current).toBe(0)
  })

  it('removing keeps the right exercise on screen', () => {
    const at2 = goTo(start(), 2)
    expect(removeEntry(at2, 0).current).toBe(1) // dips moved up
    expect(removeEntry(at2, 2).current).toBe(1) // last removed: show the new last
    expect(goTo(start(), 9).current).toBe(2)
  })
})

describe('finishWorkout', () => {
  it('trims the description and drops it when empty', () => {
    expect(finishWorkout(setDescription(start(), '  Felt strong \n')).description).toBe('Felt strong')
    expect(finishWorkout(setDescription(start(), '   '))).not.toHaveProperty('description')
  })

  it('keeps a rest day without exercises', () => {
    const rest = startWorkout({ id: 'rest', name: 'Rest day', exerciseIds: [] }, diary, NOW)
    expect(finishWorkout(setBodyWeight(rest, 81)).entries).toEqual([])
  })

  it('drops sets without reps and exercises without sets', () => {
    let active = start()
    active = updateSets(active, 0, [{ weight: 62.5, reps: 8 }, { weight: 62.5, reps: 0 }])
    active = updateSets(active, 1, [])
    active = updateSets(active, 2, [{ weight: 0, reps: 0 }])
    const done = finishWorkout(active)
    expect(done.entries).toEqual([
      { exerciseId: 'bench', exerciseName: 'Bench press', sets: [{ weight: 62.5, reps: 8 }] },
    ])
  })
})
