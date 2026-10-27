import { useState } from 'react'

interface ConfirmButtonProps {
  label: string
  /** Shown before the final button, e.g. "Delete this workout?". */
  question: string
  confirmLabel?: string
  onConfirm: () => void
}

/** A destructive button that asks inline before acting. */
export function ConfirmButton({ label, question, confirmLabel = label, onConfirm }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button type="button" className="danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  }
  return (
    <div className="confirm" role="group" aria-label={question}>
      <span>{question}</span>
      <button type="button" className="danger" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)}>
        Keep
      </button>
    </div>
  )
}
