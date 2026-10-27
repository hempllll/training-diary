import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

export type Tab = 'home' | 'exercises' | 'days'

// Line icons (24×24, drawn with the text colour), in the style of iOS tab bars.
const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'home',
    label: 'Training days',
    // dumbbell
    icon: <path d="M6.5 5.5v13M17.5 5.5v13M3 8.5v7M21 8.5v7M6.5 12h11" />,
  },
  {
    id: 'exercises',
    label: 'Exercises',
    // rising trend line
    icon: <path d="M4 19h16M5 15l4-4 3 3 6-6M14.5 8H18v3.5" />,
  },
  {
    id: 'days',
    label: 'Plans',
    // calendar
    icon: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
        <path d="M4 10h16M9 3.5v4M15 3.5v4" />
      </>
    ),
  },
]

/** How far (px) a finger moves along the bar before it drags the highlight. */
const DRAG_START = 8

interface NavBarProps {
  tab: Tab
  onSelect: (tab: Tab) => void
}

/** The tab under a point, as a position from 0 (first tab) to the last. */
function positionAt(bar: HTMLElement, x: number): number {
  const { left, width } = bar.getBoundingClientRect()
  const position = ((x - left) / width) * TABS.length - 0.5
  return Math.min(TABS.length - 1, Math.max(0, position))
}

/**
 * Bottom tab bar switching between the three main screens. The highlight
 * slides to the selected tab (stretching as it goes, re-keyed per tab), and
 * the bar grows slightly while a finger is on it. Sliding the finger along
 * the bar drags the highlight with it; letting go picks the tab under it.
 */
export function NavBar({ tab, onSelect }: NavBarProps) {
  const [pressed, setPressed] = useState(false)
  /** The highlight's position while it is dragged, else null. */
  const [drag, setDrag] = useState<number | null>(null)
  const startX = useRef(0)
  // A drag ends with a click on whichever button it started on; ignore that.
  const dragged = useRef(false)

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    setPressed(true)
    startX.current = e.clientX
    dragged.current = false
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (!pressed) return
    if (drag === null) {
      if (Math.abs(e.clientX - startX.current) < DRAG_START) return
      // Keep receiving the moves when the finger leaves the bar.
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    setDrag(positionAt(e.currentTarget, e.clientX))
  }

  function onPointerUp() {
    if (drag !== null) {
      dragged.current = true
      const next = TABS[Math.round(drag)].id
      if (next !== tab) onSelect(next)
    }
    release()
  }

  function release() {
    setPressed(false)
    setDrag(null)
  }

  const classes = ['tab-bar', pressed && 'pressed', drag !== null && 'dragging'].filter(Boolean)

  return (
    <nav
      className={classes.join(' ')}
      aria-label="Main"
      style={{ '--tab': drag ?? TABS.findIndex((t) => t.id === tab) } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={release}
      onPointerLeave={() => drag === null && setPressed(false)}
    >
      <span className="tab-indicator" aria-hidden="true">
        <span key={tab} className="tab-blob" />
      </span>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => {
            if (dragged.current) dragged.current = false
            else onSelect(t.id)
          }}
        >
          <svg
            className="tab-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {t.icon}
          </svg>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
