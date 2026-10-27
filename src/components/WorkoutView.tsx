import type { Diary, Workout } from '../diary'
import { formatDate, formatSet } from '../ui/format'
import { ConfirmButton } from './ConfirmButton'

interface WorkoutViewProps {
  workout: Workout
  diary: Diary
  /** Editing is unavailable while another workout is in progress. */
  canEdit: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

/** One recorded workout, every set listed. */
export function WorkoutView({ workout, diary, canEdit, onBack, onEdit, onDelete }: WorkoutViewProps) {
  const exerciseName = new Map(diary.exercises.map((e) => [e.id, e.name]))

  return (
    <section className="screen">
      <div className="view-header">
        <button type="button" className="back" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2>
          {workout.dayName} <span className="muted">· {formatDate(workout.date)}</span>
        </h2>
      </div>

      {workout.entries.length === 0 && <p className="notice">No exercises logged.</p>}
      <ol className="list">
        {workout.entries.map((e, i) => (
          <li key={i} className="card static">
            <span className="row-title">{exerciseName.get(e.exerciseId) ?? e.exerciseName}</span>
            {e.replaces && <span className="row-sub">instead of {e.replaces.exerciseName}</span>}
            {e.extra && !e.replaces && <span className="row-sub">added to this workout</span>}
            <ol className="sets">
              {e.sets.map((s, j) => (
                <li key={j}>{formatSet(s)}</li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      <div className="actions">
        <button type="button" onClick={onEdit} disabled={!canEdit}>
          Edit workout
        </button>
        <ConfirmButton label="Delete" question="Delete this workout?" onConfirm={onDelete} />
      </div>
      {!canEdit && <p className="notice">Finish the workout in progress to edit this one.</p>}
    </section>
  )
}
