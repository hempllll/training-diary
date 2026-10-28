/**
 * Data written by every released version must keep loading, unchanged, in the
 * current one. The fixtures were written by the real code of each version (its
 * own localStorage repository and export), so they are exactly what users have
 * stored. Never edit them; when the format changes, bump FORMAT_VERSION and
 * add a new set (`v<N>-stored-diary.json`, `v<N>-stored-active.json`,
 * `v<N>-export.json`) — the first test fails until you do. (Locally, Vitest
 * caches the expanded fixture list: if new files aren't found, delete
 * node_modules/.vitest-cache. CI always starts fresh.)
 */
import { describe, expect, it } from 'vitest'
import { dayFilters, finishWorkout, saveExercise, type Diary } from '../../diary'
import { fakeStorage } from '../../test/fakeStorage'
import {
  ACTIVE_KEY,
  backupKey,
  DIARY_KEY,
  DiaryLoadError,
  FORMAT_VERSION,
  LocalStorageDiaryRepository,
  parseDiary,
  readDiary,
} from '..'

// Vite inlines every fixture file as a string at build time.
const fixtures = import.meta.glob<string>('./fixtures/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const fixture = (name: string): string => {
  const text = fixtures[`./fixtures/${name}`]
  if (text === undefined) throw new Error(`missing fixture ${name}`)
  return text
}

const VERSIONS = Array.from({ length: FORMAT_VERSION }, (_, i) => i + 1)

/** The diary inside a stored or exported document, wrapper fields removed. */
function contentOf(text: string): Diary {
  const { exercises, days, workouts } = JSON.parse(text)
  return { exercises, days, workouts }
}

function storageWith(version: number): Storage {
  const storage = fakeStorage()
  storage.setItem(DIARY_KEY, fixture(`v${version}-stored-diary.json`))
  storage.setItem(ACTIVE_KEY, fixture(`v${version}-stored-active.json`))
  return storage
}

it('has fixtures for every format version', () => {
  for (const v of VERSIONS) {
    for (const kind of ['stored-diary', 'stored-active', 'export']) {
      expect(fixtures, `v${v}-${kind}.json`).toHaveProperty([`./fixtures/v${v}-${kind}.json`])
    }
  }
})

describe.each(VERSIONS)('data from format version %i', (version) => {
  const stored = () => fixture(`v${version}-stored-diary.json`)

  it('loads from localStorage with nothing lost or changed', async () => {
    const diary = await new LocalStorageDiaryRepository(storageWith(version)).load()
    expect(diary).toEqual(contentOf(stored()))
    expect(diary.workouts.length).toBeGreaterThan(0)
  })

  it('is the same after saving in the current format and loading again', async () => {
    const storage = storageWith(version)
    const repo = new LocalStorageDiaryRepository(storage)
    await repo.save(await repo.load())
    expect(readDiary(storage.getItem(DIARY_KEY)!).version).toBe(FORMAT_VERSION)
    expect(await new LocalStorageDiaryRepository(storage).load()).toEqual(contentOf(stored()))
  })

  it('imports as a backup file', () => {
    expect(parseDiary(fixture(`v${version}-export.json`))).toEqual(contentOf(stored()))
  })

  it('resumes the training day that was in progress and saves it', async () => {
    const repo = new LocalStorageDiaryRepository(storageWith(version))
    const active = await repo.loadActive()
    expect(active).toEqual(JSON.parse(fixture(`v${version}-stored-active.json`)))
    const done = finishWorkout(active!)
    expect(done.entries.length).toBeGreaterThan(0)
    const diary = await repo.load()
    await repo.save({ ...diary, workouts: [...diary.workouts, done] })
    expect((await repo.load()).workouts).toHaveLength(diary.workouts.length + 1)
  })
})

describe('upgrading v1 data', () => {
  it('has no descriptions or body weights, and keeps every v1 detail', async () => {
    const diary = await new LocalStorageDiaryRepository(storageWith(1)).load()
    expect(diary.exercises.every((e) => e.description === undefined)).toBe(true)
    expect(diary.workouts.every((w) => w.bodyWeight === undefined)).toBe(true)
    const push = diary.workouts.find((w) => w.dayName === 'Push')!
    expect(push.entries.map((e) => e.exerciseName)).toEqual([
      'Bench press',
      'Cable flys',
      'Dips',
      'Pec deck', // exercise deleted since: kept in history
      'Barbell row',
    ])
    expect(push.entries[1].replaces).toEqual({ exerciseId: 'incline', exerciseName: 'Incline DB press' })
    expect(push.entries[4].extra).toBe(true)
    // The Legs plan was deleted; its training day is still listed and filterable.
    expect(dayFilters(diary).map((f) => f.name)).toEqual(['Push', 'Pull', 'Legs'])
  })

  it('accepts a description once loaded', async () => {
    const storage = storageWith(1)
    const repo = new LocalStorageDiaryRepository(storage)
    const diary = await repo.load()
    await repo.save(saveExercise(diary, { ...diary.exercises[0], description: 'Seat 4' }))
    const again = await new LocalStorageDiaryRepository(storage).load()
    expect(again.exercises[0]).toEqual({ id: 'bench', name: 'Bench press', description: 'Seat 4' })
    expect(again.workouts).toEqual(diary.workouts)
  })

  it('keeps the original v1 copy as a backup, written once', async () => {
    const storage = storageWith(1)
    const repo = new LocalStorageDiaryRepository(storage)
    await repo.save(await repo.load())
    await repo.load()
    expect(storage.getItem(backupKey(1))).toBe(fixture('v1-stored-diary.json'))
    expect(storage.getItem(backupKey(FORMAT_VERSION))).toBeNull()
  })
})

describe('sets to failure (v4)', () => {
  it('keep their mark through loading, saving and resuming', async () => {
    const storage = storageWith(4)
    const repo = new LocalStorageDiaryRepository(storage)
    await repo.save(await repo.load())
    const sets = (await repo.load()).workouts.flatMap((w) => w.entries.flatMap((e) => e.sets))
    expect(sets.filter((s) => s.failure)).toHaveLength(2)
    const active = await repo.loadActive()
    expect(active!.workout.entries[0].sets[0].failure).toBe(true)
  })

  it('don’t exist in older data', async () => {
    for (const version of [1, 2, 3]) {
      const diary = await new LocalStorageDiaryRepository(storageWith(version)).load()
      expect(diary.workouts.flatMap((w) => w.entries.flatMap((e) => e.sets)).some((s) => 'failure' in s)).toBe(false)
    }
  })
})

describe('data the current version can’t read', () => {
  it.each([
    ['broken JSON', '{"exercises": [', 'not valid JSON'],
    ['a newer format', JSON.stringify({ format: 'training-diary/diary', version: 99 }), 'newer version'],
  ])('fails loudly on %s instead of starting empty', async (_, raw, message) => {
    const storage = fakeStorage()
    storage.setItem(DIARY_KEY, raw)
    const error = await new LocalStorageDiaryRepository(storage).load().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DiaryLoadError)
    expect((error as DiaryLoadError).message).toContain(message)
    expect((error as DiaryLoadError).raw).toBe(raw)
    expect(storage.getItem(DIARY_KEY)).toBe(raw)
  })

  it('keeps fields it doesn’t know (e.g. written by a newer version of the same format)', async () => {
    const storage = fakeStorage()
    const data = JSON.parse(fixture(`v${FORMAT_VERSION}-stored-diary.json`))
    data.exercises[0].futureField = { a: 1 }
    data.workouts[0].mood = 'great'
    storage.setItem(DIARY_KEY, JSON.stringify(data))
    const repo = new LocalStorageDiaryRepository(storage)
    await repo.save(await repo.load())
    const saved = JSON.parse(storage.getItem(DIARY_KEY)!)
    expect(saved.exercises[0].futureField).toEqual({ a: 1 })
    expect(saved.workouts[0].mood).toBe('great')
  })
})
