import { useState } from 'react'
import { dayFilters, recentWorkouts, type ActiveWorkout, type Diary } from '../diary'
import { formatDate, formatKg, plural, summarizeSets } from '../ui/format'
import { Dialog } from './Dialog'

interface HomeScreenProps {
  diary: Diary
  active: ActiveWorkout | null
  /** Plan ids to show; empty = all. */
  filter: ReadonlySet<string>
  onFilterChange: (filter: Set<string>) => void
  onStart: (dayId: string) => void
  onResume: () => void
  onOpenWorkout: (id: string) => void
  onCreateDay: () => void
}

/**
 * Tracked training days, newest first, with a filter by plan and the button to
 * track a new one.
 */
export function HomeScreen({
  diary,
  active,
  filter,
  onFilterChange,
  onStart,
  onResume,
  onOpenWorkout,
  onCreateDay,
}: HomeScreenProps) {
  const [choosing, setChoosing] = useState(false)
  const filters = dayFilters(diary)
  const workouts = recentWorkouts(diary.workouts, filter)
  const exerciseName = new Map(diary.exercises.map((e) => [e.id, e.name]))

  function toggle(id: string) {
    const next = new Set(filter)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onFilterChange(next)
  }

  return (
    <section className="screen">
      {active ? (
        <button type="button" className="primary start" onClick={onResume}>
          {active.editing ? 'Resume editing' : 'Resume'}: {active.workout.dayName}
        </button>
      ) : diary.days.length > 0 ? (
        <button type="button" className="primary start" onClick={() => setChoosing(true)}>
          Track a training day
        </button>
      ) : (
        <div className="empty">
          <p className="notice">Create a plan (e.g. Push, Pull, Legs) to track your first training day.</p>
          <button type="button" className="primary" onClick={onCreateDay}>
            + New plan
          </button>
        </div>
      )}

      {filters.length > 1 && (
        <div className="chips" role="group" aria-label="Show plans">
          <button type="button" aria-pressed={filter.size === 0} onClick={() => onFilterChange(new Set())}>
            All
          </button>
          {filters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter.has(f.id)} onClick={() => toggle(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
      )}

      {workouts.length === 0 ? (
        <p className="notice">
          {diary.workouts.length === 0 ? 'No training days tracked yet.' : 'No training days for these plans.'}
        </p>
      ) : (
        <ul className="list">
          {workouts.map((w) => (
            <li key={w.id}>
              <button type="button" className="card" onClick={() => onOpenWorkout(w.id)}>
                <span className="card-head">
                  <span className="row-title">{w.dayName}</span>
                  <span className="muted">{formatDate(w.date)}</span>
                </span>
                {w.bodyWeight && <span className="row-sub">Body weight {formatKg(w.bodyWeight)} kg</span>}
                {w.entries.length === 0 ? (
                  <span className="row-sub">No exercises logged</span>
                ) : (
                  <span className="entry-lines">
                    {w.entries.map((e, i) => (
                      <span key={i} className="entry-line">
                        <span>{exerciseName.get(e.exerciseId) ?? e.exerciseName}</span>
                        <span className="muted">{summarizeSets(e.sets)}</span>
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {choosing && (
        <Dialog title="Which plan?" onClose={() => setChoosing(false)}>
          <ul className="list picker-list">
            {diary.days.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="row"
                  onClick={() => {
                    setChoosing(false)
                    onStart(d.id)
                  }}
                >
                  <span className="row-main">
                    <span className="row-title">{d.name}</span>
                    <span className="row-sub">{plural(d.exerciseIds.length, 'exercise')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </section>
  )
}
