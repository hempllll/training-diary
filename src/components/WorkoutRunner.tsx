import { useState } from 'react'
import {
  goTo,
  insertEntry,
  lastBodyWeight,
  lastEntry,
  nextSet,
  removeEntry,
  replaceEntry,
  setBodyWeight,
  setDescription,
  updateSets,
  withFailure,
  type ActiveWorkout,
  type Diary,
  type Exercise,
  type SetEntry,
} from '../diary'
import { formatDate, formatKg, summarizeSets } from '../ui/format'
import { ConfirmButton } from './ConfirmButton'
import { ExercisePicker } from './ExercisePicker'
import { NumberField } from './NumberField'

interface WorkoutRunnerProps {
  active: ActiveWorkout
  diary: Diary
  onChange: (active: ActiveWorkout) => void
  onFinish: () => void
  /** Back to the home screen; the workout stays in progress. */
  onLeave: () => void
  onDiscard: () => void
  /** Create (and store) a new exercise, returning it. */
  createExercise: (name: string) => Exercise
}

/**
 * Tracking a training day: one exercise at a time in the plan's order, with
 * weight and reps per set, plus the user's body weight that day. Exercises can
 * be replaced, added or removed for this training day only; the plan itself
 * is never changed here.
 */
export function WorkoutRunner({
  active,
  diary,
  onChange,
  onFinish,
  onLeave,
  onDiscard,
  createExercise,
}: WorkoutRunnerProps) {
  const [picking, setPicking] = useState<'replace' | 'add' | null>(null)
  const { workout, current } = active
  const entries = workout.entries
  const entry = entries[current] as (typeof entries)[number] | undefined
  const isLast = current >= entries.length - 1
  const previous = entry ? lastEntry(diary.workouts, entry.exerciseId, workout.id) : null
  const description = entry && diary.exercises.find((e) => e.id === entry.exerciseId)?.description
  const lastWeight = lastBodyWeight(diary.workouts, workout.id)

  function pick(exercise: Exercise) {
    const history = diary.workouts
    onChange(
      picking === 'replace'
        ? replaceEntry(active, current, exercise, history)
        : insertEntry(active, current, exercise, history),
    )
    setPicking(null)
  }

  function setSets(sets: SetEntry[]) {
    onChange(updateSets(active, current, sets))
  }

  function changeSet(index: number, change: Partial<SetEntry>) {
    if (!entry) return
    setSets(entry.sets.map((s, i) => (i === index ? { ...s, ...change } : s)))
  }

  return (
    <section className="screen runner">
      <div className="view-header">
        <button type="button" className="back" onClick={onLeave} aria-label="Leave">
          ‹
        </button>
        <h2>{workout.dayName}</h2>
        <input
          className="date-input"
          type="date"
          aria-label="Date"
          value={workout.date}
          onChange={(e) =>
            e.target.value && onChange({ ...active, workout: { ...workout, date: e.target.value } })
          }
        />
      </div>

      <label className="body-weight">
        <span>Body weight</span>
        <NumberField
          label="Body weight (kg)"
          optional
          value={workout.bodyWeight}
          placeholder={lastWeight ? formatKg(lastWeight) : 'optional'}
          onChange={(kg) => onChange(setBodyWeight(active, kg))}
        />
        <span>kg</span>
      </label>

      {entries.length > 0 && (
        <ol className="steps" aria-label="Exercises">
          {entries.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                aria-current={i === current ? 'step' : undefined}
                onClick={() => onChange(goTo(active, i))}
              >
                {i + 1}. {e.exerciseName}
              </button>
            </li>
          ))}
        </ol>
      )}

      {entry ? (
        <div className="card static exercise-card">
          <span className="muted">
            Exercise {current + 1} of {entries.length}
          </span>
          <h3>{entry.exerciseName}</h3>
          {entry.replaces && <span className="row-sub">instead of {entry.replaces.exerciseName}</span>}
          {entry.extra && !entry.replaces && <span className="row-sub">added for today</span>}
          {description && <p className="description">{description}</p>}
          <p className="last-time">
            {previous
              ? `Last time (${formatDate(previous.workout.date)}): ${summarizeSets(previous.entry.sets)}`
              : 'First time: no previous numbers.'}
          </p>

          <table className="sets-table">
            <thead>
              <tr>
                <th scope="col">Set</th>
                <th scope="col">kg</th>
                <th scope="col">Reps</th>
                <th scope="col" className="failure-col">
                  Failure
                </th>
                <th scope="col">
                  <span className="visually-hidden">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entry.sets.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{i + 1}</th>
                  <td>
                    <NumberField
                      label={`Set ${i + 1} weight (kg)`}
                      value={s.weight}
                      onChange={(weight) => changeSet(i, { weight: weight ?? 0 })}
                    />
                  </td>
                  <td>
                    <NumberField
                      label={`Set ${i + 1} reps`}
                      integer
                      value={s.reps}
                      onChange={(reps) => changeSet(i, { reps: reps ?? 0 })}
                    />
                  </td>
                  <td className="failure-col">
                    <input
                      type="checkbox"
                      className="failure-box"
                      aria-label={`Set ${i + 1} to failure`}
                      checked={s.failure === true}
                      onChange={(e) => setSets(entry.sets.map((x, j) => (j === i ? withFailure(x, e.target.checked) : x)))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon"
                      aria-label={`Remove set ${i + 1}`}
                      onClick={() => setSets(entry.sets.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            className="add-set"
            onClick={() => setSets([...entry.sets, nextSet(entry.sets.at(-1) ?? { weight: 0, reps: 10 })])}
          >
            + Add set
          </button>

          <div className="actions">
            <button type="button" onClick={() => setPicking('replace')}>
              ⇄ Replace
            </button>
            <button type="button" onClick={() => setPicking('add')}>
              + Add exercise
            </button>
            <button type="button" onClick={() => onChange(removeEntry(active, current))}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="empty">
          <p className="notice">Rest day: no exercises. Add your body weight or a description, then finish.</p>
          <button type="button" onClick={() => setPicking('add')}>
            + Add exercise
          </button>
        </div>
      )}

      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          className="text-input"
          rows={2}
          value={workout.description ?? ''}
          placeholder="e.g. Felt strong, short on time, went for a walk"
          onChange={(e) => onChange(setDescription(active, e.target.value))}
        />
      </label>

      <div className="actions end">
        <ConfirmButton
          label={active.editing ? 'Discard changes' : 'Discard training day'}
          question={active.editing ? 'Discard your changes?' : 'Discard this training day?'}
          confirmLabel="Discard"
          onConfirm={onDiscard}
        />
      </div>

      <footer className="runner-bar">
        <button type="button" disabled={current === 0} onClick={() => onChange(goTo(active, current - 1))}>
          ‹ Previous
        </button>
        {isLast ? (
          <button type="button" className="primary" onClick={onFinish}>
            {active.editing ? 'Save changes' : 'Finish'}
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => onChange(goTo(active, current + 1))}>
            Next ›
          </button>
        )}
      </footer>

      {picking && (
        <ExercisePicker
          title={
            picking === 'replace' && entry
              ? `Replace ${entry.exerciseName} (today only)`
              : 'Add exercise (today only)'
          }
          exercises={diary.exercises}
          excludeIds={picking === 'replace' && entry ? [entry.exerciseId] : []}
          onPick={pick}
          onCreate={(name) => pick(createExercise(name))}
          onCancel={() => setPicking(null)}
        />
      )}
    </section>
  )
}
