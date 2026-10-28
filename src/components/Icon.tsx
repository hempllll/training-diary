import type { ReactNode } from 'react'

/** A 24×24 line icon drawn with the text colour, like the tab bar's. */
export function Icon({ children }: { children: ReactNode }) {
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
