import { useState } from 'react'
import { METRICS, nameError, progressFor, type Diary, type Exercise, type Metric } from '../diary'
import { formatDate, formatKg, summarizeSets } from '../ui/format'
import { ConfirmButton } from './ConfirmButton'
import { ProgressChart } from './ProgressChart'

interface ExerciseViewProps {
  exercise: Exercise
  diary: Diary
  onBack: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

/** One exercise: its progress chart, full history, rename and delete. */
export function ExerciseView({ exercise, diary, onBack, onRename, onDelete }: ExerciseViewProps) {
  const [metric, setMetric] = useState<Metric>('top')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(exercise.name)
  const [error, setError] = useState<string | null>(null)

  const points = progressFor(diary.workouts, exercise.id)
  const metricInfo = METRICS.find((m) => m.id === metric)!
  const best = points.reduce<(typeof points)[number] | null>(
    (a, p) => (a === null || p[metric] > a[metric] ? p : a),
    null,
  )
  const usedIn = diary.days.filter((d) => d.exerciseIds.includes(exercise.id))

  function saveName() {
    const problem = nameError(name, diary.exercises, exercise.id)
    setError(problem)
    if (problem) return
    onRename(name.trim())
    setRenaming(false)
  }

  return (
    <section className="screen">
      <div className="view-header">
        <button type="button" className="back" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2>{exercise.name}</h2>
        {!renaming && (
          <button type="button" onClick={() => setRenaming(true)}>
            Rename
          </button>
        )}
      </div>

      {renaming && (
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            saveName()
          }}
        >
          <input
            className="text-input"
            type="text"
            value={name}
            aria-label="Exercise name"
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
          <button type="submit" className="primary">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setRenaming(false)
              setName(exercise.name)
              setError(null)
            }}
          >
            Cancel
          </button>
        </form>
      )}
      {error && <p className="notice error">{error}</p>}

      <p className="notice">
        {usedIn.length > 0
          ? `In training days: ${usedIn.map((d) => d.name).join(', ')}`
          : 'Not in any training day.'}
      </p>

      {points.length === 0 ? (
        <p className="notice">No workouts with this exercise yet. Its progress will show up here.</p>
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
              ? 'Delete it and remove it from its training days? Past workouts keep it.'
              : 'Delete it? Past workouts keep it.'
          }
          confirmLabel="Delete"
          onConfirm={onDelete}
        />
      </div>
    </section>
  )
}
