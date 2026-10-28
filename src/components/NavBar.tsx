import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { TAB_LABELS, type Tab } from './tabs'

// Line icons (24×24, drawn with the text colour), in the style of iOS tab bars.
const TABS: { id: Tab; icon: ReactNode }[] = [
  {
    id: 'home',
    // dumbbell
    icon: <path d="M6.5 5.5v13M17.5 5.5v13M3 8.5v7M21 8.5v7M6.5 12h11" />,
  },
  {
    id: 'library',
    // bulleted list
    icon: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  },
  {
    id: 'stats',
    // rising trend line
    icon: <path d="M4 19h16M5 15l4-4 3 3 6-6M14.5 8H18v3.5" />,
  },
]

/** How far (px) a finger moves along the bar before it drags the highlight. */
const DRAG_START = 8
/** How long (ms) a tab is held before its pages pop up. */
const HOLD_MS = 450

/** A page inside a tab, offered when the tab is held. */
export interface TabPage {
  label: string
  onSelect: () => void
}

interface NavBarProps {
  tab: Tab
  onSelect: (tab: Tab) => void
  /** Tabs with several pages: holding the tab lets you pick one. */
  pages?: Partial<Record<Tab, TabPage[]>>
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
 * Holding a tab with several pages pops up a menu of them above it.
 */
export function NavBar({ tab, onSelect, pages = {} }: NavBarProps) {
  const [pressed, setPressed] = useState(false)
  /** The highlight's position while it is dragged, else null. */
  const [drag, setDrag] = useState<number | null>(null)
  /** The held tab whose pages are showing, and where its menu goes. */
  const [menu, setMenu] = useState<{ tab: Tab; x: number; bottom: number } | null>(null)
  const startX = useRef(0)
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // A drag or a hold ends with a click on the button it started on; ignore that.
  const skipClick = useRef(false)
  const backdropTouched = useRef(false)

  useEffect(() => () => clearTimeout(holdTimer.current), [])

  function openMenu(t: Tab, button: HTMLElement) {
    if (!pages[t]) return
    const box = button.getBoundingClientRect()
    const bar = button.parentElement!.getBoundingClientRect()
    setMenu({ tab: t, x: box.left + box.width / 2, bottom: window.innerHeight - bar.top + 10 })
    backdropTouched.current = false
    skipClick.current = true
    release()
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    setPressed(true)
    startX.current = e.clientX
    skipClick.current = false
    const button = (e.target as Element).closest<HTMLElement>('button[data-tab]')
    clearTimeout(holdTimer.current)
    if (button) holdTimer.current = setTimeout(() => openMenu(button.dataset.tab as Tab, button), HOLD_MS)
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (!pressed) return
    if (drag === null) {
      if (Math.abs(e.clientX - startX.current) < DRAG_START) return
      // A drag, not a hold. Keep receiving the moves when the finger leaves the bar.
      clearTimeout(holdTimer.current)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    setDrag(positionAt(e.currentTarget, e.clientX))
  }

  function onPointerUp() {
    if (drag !== null) {
      skipClick.current = true
      const next = TABS[Math.round(drag)].id
      if (next !== tab) onSelect(next)
    }
    release()
  }

  function release() {
    clearTimeout(holdTimer.current)
    setPressed(false)
    setDrag(null)
  }

  const classes = ['tab-bar', pressed && 'pressed', drag !== null && 'dragging'].filter(Boolean)

  return (
    <>
      <nav
        className={classes.join(' ')}
        aria-label="Main"
        style={{ '--tab': drag ?? TABS.findIndex((t) => t.id === tab) } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={release}
        onPointerLeave={() => drag === null && release()}
      >
        <span className="tab-indicator" aria-hidden="true">
          <span key={tab} className="tab-blob" />
        </span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tab={t.id}
            aria-current={t.id === tab ? 'page' : undefined}
            aria-haspopup={pages[t.id] ? 'menu' : undefined}
            onClick={() => {
              if (skipClick.current) skipClick.current = false
              else onSelect(t.id)
            }}
            // Right click, or a long press where the browser reports one.
            onContextMenu={(e) => {
              e.preventDefault()
              openMenu(t.id, e.currentTarget)
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
            {TAB_LABELS[t.id]}
          </button>
        ))}
      </nav>

      {menu && (
        <>
          {/* Catches a tap anywhere else, which closes the menu. Lifting the
              finger that opened it can click here too, so only a new touch counts. */}
          <div
            className="menu-backdrop"
            onPointerDown={() => (backdropTouched.current = true)}
            onClick={() => backdropTouched.current && setMenu(null)}
          />
          <div
            className="menu tab-menu"
            role="menu"
            aria-label={TAB_LABELS[menu.tab]}
            style={{ '--x': `${menu.x}px`, bottom: menu.bottom } as CSSProperties}
            onKeyDown={(e) => e.key === 'Escape' && setMenu(null)}
          >
            {pages[menu.tab]!.map((p) => (
              <button
                key={p.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null)
                  p.onSelect()
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
