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
import { parseDiary } from './diaryIO'

export interface DiaryRepository {
  load(): Promise<Diary>
  save(diary: Diary): Promise<void>
  /** The workout being logged, if any. Kept apart from the diary until finished. */
  loadActive(): Promise<ActiveWorkout | null>
  saveActive(active: ActiveWorkout | null): Promise<void>
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

const DIARY_KEY = 'training-diary.diary'
const ACTIVE_KEY = 'training-diary.active'

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
    try {
      return parseDiary(raw)
    } catch {
      return emptyDiary() // corrupt data — start clean rather than crash
    }
  }

  async save(diary: Diary): Promise<void> {
    this.storage.setItem(DIARY_KEY, JSON.stringify(diary))
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
