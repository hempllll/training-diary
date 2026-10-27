import { useId, type ReactNode } from 'react'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** A modal card over a dimmed backdrop; tapping the backdrop closes it. */
export function Dialog({ title, onClose, children }: DialogProps) {
  const titleId = useId()
  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="panel-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
