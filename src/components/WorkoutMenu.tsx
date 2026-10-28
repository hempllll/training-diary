import { useEffect, useState } from 'react'
import { Icon } from './Icon'

const TRASH = (
  <path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
)

interface WorkoutMenuProps {
  /** Names the training day for screen readers, e.g. "Push, Tue 27 Oct". */
  label: string
  /** Editing is unavailable while another training day is being tracked. */
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

/**
 * A round ⋯ button on an opened training day card. It opens a glass menu
 * above it with Edit and Delete; Delete asks once more before deleting.
 */
export function WorkoutMenu({ label, canEdit, onEdit, onDelete }: WorkoutMenuProps) {
  /** Where the open menu sits (px from the viewport's right and bottom), else null. */
  const [at, setAt] = useState<{ right: number; bottom: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const close = () => setAt(null)

  // The menu is fixed to the viewport; scrolling would leave it behind.
  useEffect(() => {
    if (!at) return
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [at])

  return (
    <div className="workout-menu" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <button
        type="button"
        className="glass-button more"
        aria-label={`More for ${label}`}
        aria-haspopup="menu"
        aria-expanded={at !== null}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          setConfirming(false)
          setAt({ right: window.innerWidth - box.right, bottom: window.innerHeight - box.top + 6 })
        }}
      >
        <Icon>
          <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth={3} />
        </Icon>
      </button>

      {at && (
        <>
          {/* Catches a tap anywhere else, which closes the menu. */}
          <div className="menu-backdrop" onClick={close} />
          <div className="menu day-menu" role="menu" aria-label={label} style={at}>
            {confirming ? (
              <>
                <p className="menu-note">Delete this training day?</p>
                <button type="button" role="menuitem" className="danger-item" onClick={onDelete}>
                  <Icon>{TRASH}</Icon>
                  Delete
                </button>
                <button type="button" role="menuitem" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canEdit}
                  onClick={() => {
                    close()
                    onEdit()
                  }}
                >
                  <Icon>
                    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
                  </Icon>
                  Edit
                </button>
                {!canEdit && <p className="menu-note">Finish the training day in progress to edit this one.</p>}
                <button type="button" role="menuitem" className="danger-item" onClick={() => setConfirming(true)}>
                  <Icon>{TRASH}</Icon>
                  Delete…
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
