import { useState } from 'react'
import { lastEntry, nameError, type Diary, type Exercise } from '../diary'
import { formatDate, summarizeSets } from '../ui/format'
import { ConfirmButton } from './ConfirmButton'

interface ExerciseViewProps {
  exercise: Exercise
  diary: Diary
  onBack: () => void
  onSave: (changes: { name: string; description: string }) => void
  onDelete: () => void
  /** Open this exercise's progress in the Stats tab. */
  onShowStats: () => void
}

/** One exercise: its description, plans, last time, edit and delete. Progress is in Stats. */
export function ExerciseView({ exercise, diary, onBack, onSave, onDelete, onShowStats }: ExerciseViewProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [error, setError] = useState<string | null>(null)

  const last = lastEntry(diary.workouts, exercise.id)
  const usedIn = diary.days.filter((d) => d.exerciseIds.includes(exercise.id))

  function save() {
    const problem = nameError(name, diary.exercises, exercise.id)
    setError(problem)
    if (problem) return
    onSave({ name: name.trim(), description: description.trim() })
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setName(exercise.name)
    setDescription(exercise.description ?? '')
    setError(null)
  }

  return (
    <section className="screen">
      <div className="view-header">
        <button type="button" className="back" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2>{exercise.name}</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="edit-form"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="text-input"
              rows={3}
              value={description}
              placeholder="e.g. Seat height 4, back pad 2"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && <p className="notice error">{error}</p>}
          <div className="actions">
            <button type="submit" className="primary">
              Save
            </button>
            <button type="button" onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        exercise.description && <p className="description">{exercise.description}</p>
      )}

      <p className="notice">
        {usedIn.length > 0
          ? `In plans: ${usedIn.map((d) => d.name).join(', ')}`
          : 'Not in any plan.'}
      </p>

      {last ? (
        <>
          <p className="notice">
            Last time ({formatDate(last.workout.date)}): {summarizeSets(last.entry.sets)}
          </p>
          <button type="button" className="card-open" onClick={onShowStats}>
            Stats ›
          </button>
        </>
      ) : (
        <p className="notice">Not tracked yet. Its progress will show up in Stats.</p>
      )}

      <div className="actions end">
        <ConfirmButton
          label="Delete exercise"
          question={
            usedIn.length > 0
              ? 'Delete it and remove it from its plans? Tracked training days keep it.'
              : 'Delete it? Tracked training days keep it.'
          }
          confirmLabel="Delete"
          onConfirm={onDelete}
        />
      </div>
    </section>
  )
}
