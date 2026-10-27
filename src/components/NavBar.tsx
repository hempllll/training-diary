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

/** Bottom tab bar switching between the three main screens. */
export function NavBar({ tab, onSelect }: NavBarProps) {
  return (
    <nav className="tab-bar" aria-label="Main">
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
