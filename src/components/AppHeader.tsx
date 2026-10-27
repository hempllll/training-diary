import { useState, type ReactNode } from 'react'

interface AppHeaderProps {
  /** What the + button does right now ("Track a training day", "New plan", …). */
  addLabel: string
  onAdd: () => void
  onBackup: () => void
}

/** A 24×24 line icon drawn with the text colour, like the tab bar's. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/**
 * The title bar: a settings gear on the left that opens a small menu (Backup,
 * more settings later), the title in the middle, and the main action (+) on
 * the right. Both buttons are round glass, the + tinted with the accent.
 */
export function AppHeader({ addLabel, onAdd, onBackup }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <header className="app-header" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <button
        type="button"
        className="glass-button"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </Icon>
      </button>
      <h1>Training Diary</h1>
      <button type="button" className="glass-button add" aria-label={addLabel} onClick={onAdd}>
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
      </button>

      {menuOpen && (
        <>
          {/* Catches a tap anywhere else, which closes the menu. */}
          <div className="menu-backdrop" onClick={close} />
          <div className="menu" role="menu" aria-label="Settings">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                onBackup()
              }}
            >
              <Icon>
                <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
              </Icon>
              Backup
            </button>
          </div>
        </>
      )}
    </header>
  )
}
