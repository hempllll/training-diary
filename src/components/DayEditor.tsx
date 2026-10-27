import { useState } from 'react'
import { moveItem, nameError, newId, type Diary, type Exercise, type TrainingDay } from '../diary'
import { ConfirmButton } from './ConfirmButton'
import { ExercisePicker } from './ExercisePicker'

interface DayEditorProps {
  /** null = create a new training day. */
  day: TrainingDay | null
  diary: Diary
  onSave: (day: TrainingDay) => void
  onDelete?: () => void
  onCancel: () => void
  /** Create (and store) a new exercise, returning it. */
  createExercise: (name: string) => Exercise
}

/**
 * Edit a training day's name and its ordered exercise list. Changes are a
 * draft until Save, so Cancel leaves the stored day untouched.
 */
export function DayEditor({ day, diary, onSave, onDelete, onCancel, createExercise }: DayEditorProps) {
  const [name, setName] = useState(day?.name ?? '')
  const [exerciseIds, setExerciseIds] = useState(day?.exerciseIds ?? [])
  const [picking, setPicking] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const byId = new Map(diary.exercises.map((e) => [e.id, e]))
  const shownIds = exerciseIds.filter((id) => byId.has(id))

  function save() {
    const problems = [
      nameError(name, diary.days, day?.id),
      shownIds.length === 0 ? 'Add at least one exercise.' : null,
    ].filter((p): p is string => p !== null)
    setErrors(problems)
    if (problems.length > 0) return
    onSave({ id: day?.id ?? newId(), name: name.trim(), exerciseIds: shownIds })
  }

  function add(exercise: Exercise) {
    setExerciseIds((ids) => [...ids, exercise.id])
    setPicking(false)
  }

  return (
    <section className="screen editor">
      <div className="view-header">
        <button type="button" className="back" onClick={onCancel} aria-label="Back">
          ‹
        </button>
        <h2>{day ? `Edit ${day.name}` : 'New training day'}</h2>
      </div>

      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="text-input"
          type="text"
          value={name}
          placeholder="e.g. Push"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">Exercises, in order</span>
        {shownIds.length === 0 && <p className="notice">No exercises yet.</p>}
        <ol className="list">
          {shownIds.map((id, i) => {
            const exerciseName = byId.get(id)!.name
            return (
              <li key={id} className="row static order-row">
                <span className="order-number">{i + 1}</span>
                <span className="row-title">{exerciseName}</span>
                <span className="order-buttons">
                  <button
                    type="button"
                    className="icon"
                    aria-label={`Move ${exerciseName} up`}
                    disabled={i === 0}
                    onClick={() => setExerciseIds(moveItem(shownIds, i, i - 1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label={`Move ${exerciseName} down`}
                    disabled={i === shownIds.length - 1}
                    onClick={() => setExerciseIds(moveItem(shownIds, i, i + 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label={`Remove ${exerciseName}`}
                    onClick={() => setExerciseIds(shownIds.filter((x) => x !== id))}
                  >
                    ✕
                  </button>
                </span>
              </li>
            )
          })}
        </ol>
        <button type="button" className="add-set" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="button" className="primary" onClick={save}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {onDelete && (
        <div className="actions end">
          <ConfirmButton
            label="Delete training day"
            question="Delete it? Past workouts are kept."
            confirmLabel="Delete"
            onConfirm={onDelete}
          />
        </div>
      )}

      {picking && (
        <ExercisePicker
          title="Add exercise"
          exercises={diary.exercises}
          excludeIds={shownIds}
          onPick={add}
          onCreate={(newName) => add(createExercise(newName))}
          onCancel={() => setPicking(false)}
        />
      )}
    </section>
  )
}
