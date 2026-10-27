import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveWorkout, Diary } from '../diary'
import type { DiaryRepository } from '../storage'

/**
 * Load the diary (and any workout in progress) from a repository and keep
 * React state in sync with it. `diary` is null until the first load finishes.
 * If loading fails, `loadError` is set and `diary` stays null, so nothing can
 * be saved over the stored data.
 */
export function useDiary(repo: DiaryRepository) {
  const [diary, setDiary] = useState<Diary | null>(null)
  const [active, setActiveState] = useState<ActiveWorkout | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  // The latest diary, so back-to-back updates each build on the previous one.
  const latest = useRef<Diary | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([repo.load(), repo.loadActive()]).then(
      ([loaded, loadedActive]) => {
        if (cancelled) return
        latest.current = loaded
        setDiary(loaded)
        setActiveState(loadedActive)
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(err)
      },
    )
    return () => {
      cancelled = true
    }
  }, [repo])

  /** Apply a pure change (see `src/diary`) and persist the result. */
  const update = useCallback(
    async (change: (d: Diary) => Diary) => {
      if (!latest.current) return
      const next = change(latest.current)
      latest.current = next
      setDiary(next)
      await repo.save(next)
    },
    [repo],
  )

  const setActive = useCallback(
    async (next: ActiveWorkout | null) => {
      setActiveState(next)
      await repo.saveActive(next)
    },
    [repo],
  )

  return { diary, active, loadError, update, setActive }
}
