import { useState, type AnimationEvent } from 'react'
import { dayFilters, recentWorkouts, type ActiveWorkout, type Diary } from '../diary'
import { formatDate, formatKg, setGroups } from '../ui/format'
import { WorkoutMenu } from './WorkoutMenu'

interface HomeScreenProps {
  diary: Diary
  active: ActiveWorkout | null
  /** Plan ids to show; empty = all. */
  filter: ReadonlySet<string>
  onFilterChange: (filter: Set<string>) => void
  /** Training days opened up to show their exercises. */
  expanded: ReadonlySet<string>
  onExpandedChange: (expanded: Set<string>) => void
  onResume: () => void
  onEditWorkout: (id: string) => void
  onDeleteWorkout: (id: string) => void
  onCreateDay: () => void
}

/** Whether cards may animate opening and closing (not under reduced motion). */
const animates = () => window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches ?? false

/**
 * Tracked training days, newest first, with a filter by plan (a new one is
 * tracked with the header's + button). Each card shows the plan, date and body
 * weight; tapping it opens it up (smoothly, several at once) to show the
 * description and exercises, with a ⋯ menu to edit or delete the day.
 */
export function HomeScreen({
  diary,
  active,
  filter,
  onFilterChange,
  expanded,
  onExpandedChange,
  onResume,
  onEditWorkout,
  onDeleteWorkout,
  onCreateDay,
}: HomeScreenProps) {
  // Cards playing their closing animation; they leave `expanded` when it ends.
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set())
  const filters = dayFilters(diary)
  const workouts = recentWorkouts(diary.workouts, filter)
  const exerciseName = new Map(diary.exercises.map((e) => [e.id, e.name]))

  /** A copy of `set` with `id` added or removed. */
  function toggled(set: ReadonlySet<string>, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  function toggle(id: string) {
    if (closing.has(id)) setClosing(toggled(closing, id)) // tapped again while closing: stay open
    else if (expanded.has(id) && animates()) setClosing(toggled(closing, id))
    else onExpandedChange(toggled(expanded, id))
  }

  function closed(id: string, e: AnimationEvent) {
    if (e.animationName !== 'card-close' || !closing.has(id)) return
    setClosing(toggled(closing, id))
    onExpandedChange(toggled(expanded, id))
  }

  return (
    <section className="screen">
      {active ? (
        <button type="button" className="primary start" onClick={onResume}>
          {active.editing ? 'Resume editing' : 'Resume'}: {active.workout.dayName}
        </button>
      ) : (
        diary.days.length === 0 && (
          <div className="empty">
            <p className="notice">Create a plan (e.g. Push, Pull, Legs) to track your first training day.</p>
            <button type="button" className="primary" onClick={onCreateDay}>
              + New plan
            </button>
          </div>
        )
      )}

      {filters.length > 1 && (
        <div className="chips" role="group" aria-label="Show plans">
          <button type="button" aria-pressed={filter.size === 0} onClick={() => onFilterChange(new Set())}>
            All
          </button>
          {filters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter.has(f.id)} onClick={() => onFilterChange(toggled(filter, f.id))}>
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
          {workouts.map((w) => {
            const shown = expanded.has(w.id)
            const open = shown && !closing.has(w.id)
            const bodyId = `workout-${w.id}`
            const exerciseLines = w.entries.map((e, i) => (
              <li key={i} className="entry-line">
                <span>
                  {exerciseName.get(e.exerciseId) ?? e.exerciseName}
                  {e.replaces && <span className="entry-note">instead of {e.replaces.exerciseName}</span>}
                  {e.extra && !e.replaces && <span className="entry-note">added that day</span>}
                </span>
                <span className="muted">
                  {setGroups(e.sets).map((g, j) => (
                    <span key={j} className="set-group">
                      {g}
                    </span>
                  ))}
                </span>
              </li>
            ))
            return (
              <li key={w.id} className="card">
                <button
                  type="button"
                  className="card-toggle"
                  aria-expanded={open}
                  aria-controls={bodyId}
                  onClick={() => toggle(w.id)}
                >
                  <span className="card-head">
                    <span className="row-title">{w.dayName}</span>
                    <span className="muted">{formatDate(w.date)}</span>
                    <span className="chevron" aria-hidden="true">
                      ›
                    </span>
                  </span>
                  {w.bodyWeight && <span className="row-sub">Body weight {formatKg(w.bodyWeight)} kg</span>}
                </button>
                {shown && (
                  // The outer grid row grows from 0 to the content's height
                  // (card-open / card-close in App.css); the clip hides the rest.
                  <div
                    id={bodyId}
                    className={open ? 'card-body' : 'card-body closing'}
                    inert={!open}
                    onAnimationEnd={(e) => closed(w.id, e)}
                  >
                    <div className="card-body-clip">
                      <div className="card-body-content">
                        {w.description && <p className="card-description">{w.description}</p>}
                        {w.entries.length === 0 ? (
                          <p className="row-sub">No exercises</p>
                        ) : (
                          <ul className="entry-lines">{exerciseLines}</ul>
                        )}
                        <WorkoutMenu
                          label={`${w.dayName}, ${formatDate(w.date)}`}
                          canEdit={!active}
                          onEdit={() => onEditWorkout(w.id)}
                          onDelete={() => onDeleteWorkout(w.id)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
