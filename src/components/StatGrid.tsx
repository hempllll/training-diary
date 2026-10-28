import type { CSSProperties } from 'react'

export interface Stat {
  label: string
  value: string
  /** A second line under the value, e.g. the date of a record. */
  sub?: string
}

/** Numbers in tiles, two per row (or `columns`). */
export function StatGrid({ stats, columns }: { stats: Stat[]; columns?: number }) {
  return (
    <dl className="stat-grid" style={columns ? ({ '--columns': columns } as CSSProperties) : undefined}>
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <dt>{s.label}</dt>
          <dd>
            {s.value}
            {s.sub && <span className="stat-sub">{s.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
