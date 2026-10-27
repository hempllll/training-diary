import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Metric, ProgressPoint } from '../diary'
import { formatDate, formatKg } from '../ui/format'
import { niceTicks } from '../ui/ticks'

interface ProgressChartProps {
  /** Oldest first. */
  points: ProgressPoint[]
  metric: Metric
  label: string
  unit: string
}

// Drawing size in SVG units; the SVG scales to the card's width.
const W = 320
const H = 180
const PAD = { left: 40, right: 14, top: 14, bottom: 26 }

/** Whole days since 1970 for a `YYYY-MM-DD` date (x positions follow real time). */
const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * A single-series line chart of one measure over time. Tap or drag across it
 * (or use the arrow keys) to read any workout's value; the newest is shown
 * by default. The history list below it doubles as the table view.
 */
export function ProgressChart({ points, metric, label, unit }: ProgressChartProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const index = Math.min(selected ?? points.length - 1, points.length - 1)

  const values = points.map((p) => p[metric])
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const yMin = ticks[0]
  const yMax = ticks.at(-1)!
  const days = points.map((p) => dayNumber(p.date))
  const xMin = days[0]
  const xMax = days.at(-1)!

  const x = (i: number) =>
    xMax === xMin
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((days[i] - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(values[i])}`).join(' ')
  const current = points[index]

  function selectAt(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    if (box.width === 0) return
    const px = ((e.clientX - box.left) / box.width) * W
    let nearest = 0
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i
    })
    setSelected(nearest)
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowLeft') setSelected(Math.max(0, index - 1))
    else if (e.key === 'ArrowRight') setSelected(Math.min(points.length - 1, index + 1))
    else return
    e.preventDefault()
  }

  return (
    <figure className="chart">
      <figcaption className="chart-readout" aria-live="polite">
        <strong>
          {formatKg(current[metric])} {unit}
        </strong>{' '}
        <span className="muted">
          {label} · {formatDate(current.date)}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} over time, ${points.length} workouts`}
        tabIndex={0}
        onPointerDown={selectAt}
        onPointerMove={(e) => e.buttons > 0 || e.pointerType === 'mouse' ? selectAt(e) : undefined}
        onKeyDown={onKey}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {formatKg(t)}
            </text>
          </g>
        ))}
        <text className="axis" x={PAD.left} y={H - 6} textAnchor="start">
          {formatDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text className="axis" x={W - PAD.right} y={H - 6} textAnchor="end">
            {formatDate(points.at(-1)!.date)}
          </text>
        )}

        <line className="crosshair" x1={x(index)} x2={x(index)} y1={PAD.top} y2={H - PAD.bottom} />
        <path className="line" d={path} />
        {points.map((p, i) => (
          <circle
            key={p.workoutId}
            className={i === index ? 'dot selected' : 'dot'}
            cx={x(i)}
            cy={y(values[i])}
            r={i === index ? 5.5 : 4}
          />
        ))}
      </svg>
    </figure>
  )
}
