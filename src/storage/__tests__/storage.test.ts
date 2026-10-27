import { describe, expect, it } from 'vitest'
import type { ActiveWorkout, Diary } from '../../diary'
import { fakeStorage } from '../../test/fakeStorage'
import { exportDiary, FORMAT_VERSION, LocalStorageDiaryRepository, parseDiary } from '..'

const diary: Diary = {
  exercises: [{ id: 'bench', name: 'Bench press' }],
  days: [{ id: 'push', name: 'Push', exerciseIds: ['bench'] }],
  workouts: [
    {
      id: 'w1',
      dayId: 'push',
      dayName: 'Push',
      date: '2026-10-27',
      startedAt: '2026-10-27T17:00:00.000Z',
      entries: [
        {
          exerciseId: 'bench',
          exerciseName: 'Bench press',
          sets: [{ weight: 62.5, reps: 8 }],
          replaces: { exerciseId: 'incline', exerciseName: 'Incline press' },
        },
      ],
    },
  ],
}

describe('export / import', () => {
  it('round-trips the diary', () => {
    const text = exportDiary(diary)
    expect(JSON.parse(text)).toMatchObject({ format: 'training-diary/diary', version: FORMAT_VERSION })
    expect(parseDiary(text)).toEqual(diary)
  })

  it.each([
    ['not json', 'File is not valid JSON'],
    ['[]', 'The file must be an object'],
    ['{"format":"spot-alert/spots","exercises":[],"days":[],"workouts":[]}', 'not a training diary backup'],
    ['{"exercises":[],"days":[]}', 'workouts must be an array'],
    ['{"exercises":[{"id":"a"}],"days":[],"workouts":[]}', 'exercises[0].name must be a non-empty string'],
    [
      '{"exercises":[{"id":"a","name":"A"},{"id":"a","name":"B"}],"days":[],"workouts":[]}',
      'exercises[1].id is used twice',
    ],
  ])('rejects %s', (text, message) => {
    expect(() => parseDiary(text)).toThrow(message)
  })

  it('rejects bad new fields', () => {
    const bad = structuredClone(diary) as unknown as { exercises: { description: unknown }[]; workouts: { bodyWeight: unknown }[] }
    bad.exercises[0].description = 42
    expect(() => parseDiary(JSON.stringify(bad))).toThrow('exercises[0].description must be text')
    bad.exercises[0].description = 'Seat 4'
    bad.workouts[0].bodyWeight = 0
    expect(() => parseDiary(JSON.stringify(bad))).toThrow('workouts[0].bodyWeight must be a number > 0')
  })

  it('rejects bad sets with the path to the problem', () => {
    const bad = structuredClone(diary) as unknown as { workouts: { entries: { sets: unknown[] }[] }[] }
    bad.workouts[0].entries[0].sets[0] = { weight: -5, reps: 8 }
    expect(() => parseDiary(JSON.stringify(bad))).toThrow('workouts[0].entries[0].sets[0].weight')
    bad.workouts[0].entries[0].sets[0] = { weight: 5, reps: 2.5 }
    expect(() => parseDiary(JSON.stringify(bad))).toThrow('reps must be a whole number')
  })
})

describe('LocalStorageDiaryRepository', () => {
  it('saves and loads the diary and the active workout', async () => {
    const storage = fakeStorage()
    const repo = new LocalStorageDiaryRepository(storage)
    expect(await repo.load()).toEqual({ exercises: [], days: [], workouts: [] })
    expect(await repo.loadActive()).toBeNull()

    const active: ActiveWorkout = { workout: diary.workouts[0], current: 0 }
    await repo.save(diary)
    await repo.saveActive(active)
    const again = new LocalStorageDiaryRepository(storage)
    expect(await again.load()).toEqual(diary)
    expect(await again.loadActive()).toEqual(active)

    await again.saveActive(null)
    expect(await again.loadActive()).toBeNull()
  })

  it('drops a corrupt workout in progress', async () => {
    const storage = fakeStorage()
    storage.setItem('training-diary.active', '"nope"')
    expect(await new LocalStorageDiaryRepository(storage).loadActive()).toBeNull()
  })
})
