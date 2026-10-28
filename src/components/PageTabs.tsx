import type { CSSProperties } from 'react'

interface PageTabsProps {
  /** Names the menu for screen readers, e.g. "Library". */
  label: string
  pages: { id: string; label: string }[]
  current: string
  onSelect: (id: string) => void
}

/**
 * The glass menu at the top of a tab with several pages (Exercises / Plans).
 * Styled like the tab bar: the highlight slides to the current page. It
 * stays at the top while the page scrolls underneath.
 */
export function PageTabs({ label, pages, current, onSelect }: PageTabsProps) {
  const index = pages.findIndex((p) => p.id === current)
  return (
    <nav
      className="page-tabs"
      aria-label={label}
      style={{ '--tab': index, '--count': pages.length } as CSSProperties}
    >
      <span className="tab-indicator" aria-hidden="true">
        <span key={current} className="tab-blob" />
      </span>
      {pages.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-current={p.id === current ? 'page' : undefined}
          onClick={() => p.id !== current && onSelect(p.id)}
        >
          {p.label}
        </button>
      ))}
    </nav>
  )
}
