import { useState } from 'react'
import { METRICS, nameError, progressFor, type Diary, type Exercise, type Metric } from '../diary'
import { formatDate, formatKg, summarizeSets } from '../ui/format'
import { ConfirmButton } from './ConfirmButton'
import { ProgressChart } from './ProgressChart'

interface ExerciseViewProps {
  exercise: Exercise
  diary: Diary
  onBack: () => void
  onSave: (changes: { name: string; description: string }) => void
  onDelete: () => void
}

/** One exercise: its description, progress chart, full history, edit and delete. */
export function ExerciseView({ exercise, diary, onBack, onSave, onDelete }: ExerciseViewProps) {
  const [metric, setMetric] = useState<Metric>('top')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(exercise.name)
  const [description, setDescription] = useState(exercise.description ?? '')
  const [error, setError] = useState<string | null>(null)

  const points = progressFor(diary.workouts, exercise.id)
  const metricInfo = METRICS.find((m) => m.id === metric)!
  const best = points.reduce<(typeof points)[number] | null>(
    (a, p) => (a === null || p[metric] > a[metric] ? p : a),
    null,
  )
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

      {points.length === 0 ? (
        <p className="notice">Not tracked yet. Its progress will show up here.</p>
      ) : (
        <>
          <div className="segmented" role="group" aria-label="Measure">
            {METRICS.map((m) => (
              <button key={m.id} type="button" aria-pressed={m.id === metric} onClick={() => setMetric(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <ProgressChart points={points} metric={metric} label={metricInfo.label} unit={metricInfo.unit} />
          {best && (
            <p className="notice">
              Best {metricInfo.label.toLowerCase()}: {formatKg(best[metric])} {metricInfo.unit} (
              {formatDate(best.date)})
            </p>
          )}

          <h3 className="section-title">History</h3>
          <ul className="list">
            {[...points].reverse().map((p) => (
              <li key={p.workoutId} className="row static">
                <span className="row-main">
                  <span className="row-title">
                    {formatDate(p.date)} <span className="muted">· {p.dayName}</span>
                  </span>
                  <span className="row-sub">{summarizeSets(p.sets)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
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
