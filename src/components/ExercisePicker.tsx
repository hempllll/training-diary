import { useState } from 'react'
import { nameError, sortedExercises, type Exercise } from '../diary'
import { Dialog } from './Dialog'

interface ExercisePickerProps {
  title: string
  exercises: Exercise[]
  /** Exercises not to offer (e.g. already in the training day). */
  excludeIds?: string[]
  onPick: (exercise: Exercise) => void
  /** Create a new exercise from the typed name and pick it. */
  onCreate: (name: string) => void
  onCancel: () => void
}

/** Choose an existing exercise, or type a new name to create one on the spot. */
export function ExercisePicker({
  title,
  exercises,
  excludeIds = [],
  onPick,
  onCreate,
  onCancel,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = sortedExercises(exercises).filter(
    (e) => !excludeIds.includes(e.id) && e.name.toLowerCase().includes(needle),
  )
  const canCreate = needle !== '' && nameError(query, exercises) === null

  return (
    <Dialog title={title} onClose={onCancel}>
      <input
        className="text-input"
        type="text"
        value={query}
        placeholder="Search or type a new exercise"
        aria-label="Search or type a new exercise"
        onChange={(e) => setQuery(e.target.value)}
      />
      {canCreate && (
        <button type="button" className="primary" onClick={() => onCreate(query.trim())}>
          + Create “{query.trim()}”
        </button>
      )}
      {shown.length > 0 ? (
        <ul className="list picker-list">
          {shown.map((e) => (
            <li key={e.id}>
              <button type="button" className="row" onClick={() => onPick(e)}>
                <span className="row-title">{e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !canCreate && <p className="notice">No exercises to choose from yet. Type a name to create one.</p>
      )}
    </Dialog>
  )
}
