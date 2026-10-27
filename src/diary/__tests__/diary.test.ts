import { describe, expect, it } from 'vitest'
import {
  dayFilters,
  deleteDay,
  deleteExercise,
  emptyDiary,
  moveItem,
  nameError,
  recentWorkouts,
  saveDay,
  saveExercise,
  type Diary,
  type Workout,
} from '..'

const workout = (id: string, dayId: string, date: string, startedAt = `${date}T10:00:00Z`): Workout => ({
  id,
  dayId,
  dayName: dayId.toUpperCase(),
  date,
  startedAt,
  entries: [],
})

const diary: Diary = {
  exercises: [
    { id: 'bench', name: 'Bench press' },
    { id: 'row', name: 'Barbell row' },
  ],
  days: [
    { id: 'push', name: 'Push', exerciseIds: ['bench'] },
    { id: 'pull', name: 'Pull', exerciseIds: ['row', 'bench'] },
  ],
  workouts: [
    workout('w1', 'push', '2026-10-20'),
    workout('w2', 'pull', '2026-10-22'),
    workout('w3', 'push', '2026-10-22', '2026-10-22T18:00:00Z'),
    workout('w4', 'legs', '2026-10-01'), // its day was deleted
  ],
}

describe('nameError', () => {
  it('rejects empty and duplicate names, ignoring case and spaces', () => {
    expect(nameError('  ', diary.exercises)).toBe('Enter a name.')
    expect(nameError(' bench PRESS ', diary.exercises)).toBe('"Bench press" already exists.')
    expect(nameError('Squat', diary.exercises)).toBeNull()
  })

  it('lets an item keep its own name', () => {
    expect(nameError('Bench press', diary.exercises, 'bench')).toBeNull()
  })
})

describe('exercises', () => {
  it('adds and renames, trimming the name', () => {
    let d = saveExercise(emptyDiary(), { id: 'a', name: ' Squat ' })
    d = saveExercise(d, { id: 'a', name: 'Back squat' })
    expect(d.exercises).toEqual([{ id: 'a', name: 'Back squat' }])
  })

  it('deleting removes it from every training day but keeps workouts', () => {
    const d = deleteExercise(diary, 'bench')
    expect(d.exercises.map((e) => e.id)).toEqual(['row'])
    expect(d.days.map((x) => x.exerciseIds)).toEqual([[], ['row']])
    expect(d.workouts).toBe(diary.workouts)
  })
})

describe('training days', () => {
  it('updates in place and deletes', () => {
    const d = saveDay(diary, { id: 'push', name: 'Push A', exerciseIds: [] })
    expect(d.days.map((x) => x.name)).toEqual(['Push A', 'Pull'])
    expect(deleteDay(d, 'push').days.map((x) => x.id)).toEqual(['pull'])
  })
})

describe('moveItem', () => {
  it('moves an item and clamps the target', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 9)).toEqual(['a', 'b', 'c'])
  })
})

describe('recentWorkouts', () => {
  it('sorts newest first, later start first on the same date', () => {
    expect(recentWorkouts(diary.workouts, new Set()).map((w) => w.id)).toEqual(['w3', 'w2', 'w1', 'w4'])
  })

  it('keeps only the chosen training days', () => {
    expect(recentWorkouts(diary.workouts, new Set(['push'])).map((w) => w.id)).toEqual(['w3', 'w1'])
    expect(recentWorkouts(diary.workouts, new Set(['pull', 'legs'])).map((w) => w.id)).toEqual(['w2', 'w4'])
  })
})

describe('dayFilters', () => {
  it('lists current days, then deleted days that still have workouts', () => {
    expect(dayFilters(diary)).toEqual([
      { id: 'push', name: 'Push' },
      { id: 'pull', name: 'Pull' },
      { id: 'legs', name: 'LEGS' },
    ])
  })
})
