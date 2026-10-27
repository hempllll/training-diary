import { useState, type CSSProperties } from 'react'

export type Tab = 'home' | 'exercises' | 'days'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Training days', icon: '🏋️' },
  { id: 'exercises', label: 'Exercises', icon: '📈' },
  { id: 'days', label: 'Plans', icon: '🗓️' },
]

interface NavBarProps {
  tab: Tab
  onSelect: (tab: Tab) => void
}

/**
 * Bottom tab bar switching between the three main screens. The highlight
 * slides to the selected tab (stretching as it goes, re-keyed per tab), and
 * the bar grows slightly while a finger is on it; the motion is all CSS.
 */
export function NavBar({ tab, onSelect }: NavBarProps) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)

  return (
    <nav
      className={pressed ? 'tab-bar pressed' : 'tab-bar'}
      aria-label="Main"
      style={{ '--tab': TABS.findIndex((t) => t.id === tab) } as CSSProperties}
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      <span className="tab-indicator" aria-hidden="true">
        <span key={tab} className="tab-blob" />
      </span>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => onSelect(t.id)}
        >
          <span className="tab-icon" aria-hidden="true">
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
