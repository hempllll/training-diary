import type { TrainingDay } from '../diary'
import { planSummary } from '../ui/format'
import { Dialog } from './Dialog'

interface PlanChooserProps {
  days: TrainingDay[]
  onChoose: (dayId: string) => void
  onClose: () => void
}

/** Asks which plan to track a training day for. */
export function PlanChooser({ days, onChoose, onClose }: PlanChooserProps) {
  return (
    <Dialog title="Which plan?" onClose={onClose}>
      <ul className="list picker-list">
        {days.map((d) => (
          <li key={d.id}>
            <button type="button" className="row" onClick={() => onChoose(d.id)}>
              <span className="row-main">
                <span className="row-title">{d.name}</span>
                <span className="row-sub">{planSummary(d.exerciseIds.length)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
