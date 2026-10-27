/**
 * Storage-agnostic diary repository.
 *
 * The interface is async so the backing store can later move from localStorage
 * to IndexedDB without changing any caller. The diary is small (even years of
 * workouts are a few hundred KB), so it is loaded and saved as one document;
 * that also keeps multi-part changes (e.g. deleting an exercise from every
 * training day) atomic.
 */
import { emptyDiary, type ActiveWorkout, type Diary } from '../diary'
import { errorText } from '../ui/format'
import { FORMAT_VERSION, readDiary, serializeDiary } from './diaryIO'

export interface DiaryRepository {
  /** Throws `DiaryLoadError` if stored data exists but can't be read. */
  load(): Promise<Diary>
  save(diary: Diary): Promise<void>
  /** The workout being logged, if any. Kept apart from the diary until finished. */
  loadActive(): Promise<ActiveWorkout | null>
  saveActive(active: ActiveWorkout | null): Promise<void>
}

/**
 * Stored data that couldn't be read. The app stops instead of starting with an
 * empty diary, which would overwrite the user's data on the next save.
 */
export class DiaryLoadError extends Error {
  /** The stored text, so the user can still download it. */
  readonly raw: string

  constructor(message: string, raw: string) {
    super(message)
    this.raw = raw
  }
}

/** In-memory repository, for tests and ephemeral use. */
export class InMemoryDiaryRepository implements DiaryRepository {
  private diary: Diary
  private active: ActiveWorkout | null

  constructor(diary: Diary = emptyDiary(), active: ActiveWorkout | null = null) {
    this.diary = structuredClone(diary)
    this.active = structuredClone(active)
  }

  async load(): Promise<Diary> {
    return structuredClone(this.diary)
  }

  async save(diary: Diary): Promise<void> {
    this.diary = structuredClone(diary)
  }

  async loadActive(): Promise<ActiveWorkout | null> {
    return structuredClone(this.active)
  }

  async saveActive(active: ActiveWorkout | null): Promise<void> {
    this.active = structuredClone(active)
  }
}

export const DIARY_KEY = 'training-diary.diary'
export const ACTIVE_KEY = 'training-diary.active'
/** Where the stored copy written by an older version is kept, e.g. `…backup.v1`. */
export const backupKey = (version: number) => `training-diary.backup.v${version}`

/**
 * localStorage-backed repository. localStorage works in an installed iOS PWA
 * (separate from Safari's storage — hence the JSON backup in diaryIO.ts).
 */
export class LocalStorageDiaryRepository implements DiaryRepository {
  private storage: Storage

  constructor(storage: Storage = globalThis.localStorage) {
    this.storage = storage
  }

  async load(): Promise<Diary> {
    const raw = this.storage.getItem(DIARY_KEY)
    if (!raw) return emptyDiary()
    let read: ReturnType<typeof readDiary>
    try {
      read = readDiary(raw)
    } catch (err) {
      throw new DiaryLoadError(errorText(err), raw)
    }
    // Data from an older version is rewritten in the new format on the next
    // save. Keep the original once, as a safety net.
    if (read.version < FORMAT_VERSION && this.storage.getItem(backupKey(read.version)) === null) {
      this.storage.setItem(backupKey(read.version), raw)
    }
    return read.diary
  }

  async save(diary: Diary): Promise<void> {
    this.storage.setItem(DIARY_KEY, serializeDiary(diary))
  }

  async loadActive(): Promise<ActiveWorkout | null> {
    const raw = this.storage.getItem(ACTIVE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as ActiveWorkout
      return Array.isArray(parsed?.workout?.entries) ? parsed : null
    } catch {
      return null
    }
  }

  async saveActive(active: ActiveWorkout | null): Promise<void> {
    if (active) this.storage.setItem(ACTIVE_KEY, JSON.stringify(active))
    else this.storage.removeItem(ACTIVE_KEY)
  }
}
