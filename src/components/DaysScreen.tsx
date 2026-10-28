import { sortWorkouts, type Diary } from '../diary'
import { formatDate, planSummary } from '../ui/format'

interface DaysScreenProps {
  diary: Diary
  onAdd: () => void
  onEdit: (id: string) => void
}

/** The user's plans (`TrainingDay`s in code); tap one to edit it. */
export function DaysScreen({ diary, onAdd, onEdit }: DaysScreenProps) {
  const lastDone = new Map<string, string>()
  for (const w of sortWorkouts(diary.workouts)) if (!lastDone.has(w.dayId)) lastDone.set(w.dayId, w.date)

  return (
    <section className="screen">
      <h2 className="visually-hidden">Plans</h2>
      <button type="button" className="new-plan" onClick={onAdd}>
        + New plan
      </button>

      {diary.days.length === 0 ? (
        <p className="notice">
          No plans yet. Create one, e.g. “Push” with your push exercises, or a rest day without any.
        </p>
      ) : (
        <ul className="list">
          {diary.days.map((d) => {
            const last = lastDone.get(d.id)
            return (
              <li key={d.id}>
                <button type="button" className="row" onClick={() => onEdit(d.id)}>
                  <span className="row-main">
                    <span className="row-title">{d.name}</span>
                    <span className="row-sub">
                      {planSummary(d.exerciseIds.length)}
                      {last ? ` · last ${formatDate(last)}` : ''}
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
