import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { dayNumber } from '../diary'
import { formatDate, formatDecimal } from '../ui/format'
import { niceTicks } from '../ui/ticks'

/** One value on one date. */
export interface ChartPoint {
  id: string
  date: string
  value: number
  /** Shown after the value when the point is selected, e.g. "× 10 reps". */
  detail?: string
}

interface LineChartProps {
  /** Oldest first. */
  points: ChartPoint[]
  /** What the values are, e.g. "Body weight". */
  label: string
  unit: string
  /**
   * A smoothed version of the points (one value per point). When given, it is
   * drawn as the line and the points as faint dots beside it.
   */
  average?: { values: number[]; label: string }
}

// Drawing size in SVG units; the SVG scales to the card's width.
const W = 320
const H = 180
const PAD = { left: 40, right: 14, top: 14, bottom: 26 }

const show = (value: number, unit: string) => `${formatDecimal(value, 2)} ${unit}`.trim()

/**
 * A line chart of one measure over time. Tap or drag across it (or use the
 * arrow keys) to read any point's value; the newest is shown by default.
 */
export function LineChart({ points, label, unit, average }: LineChartProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const index = Math.min(selected ?? points.length - 1, points.length - 1)

  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const yMin = ticks[0]
  const yMax = ticks.at(-1)!
  // x positions follow real time, so gaps between dates show.
  const days = points.map((p) => dayNumber(p.date))
  const xMin = days[0]
  const xMax = days.at(-1)!

  const x = (i: number) =>
    xMax === xMin
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((days[i] - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom)

  const lineValues = average?.values ?? values
  const path = lineValues.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
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
        <strong>{show(current.value, unit)}</strong>
        {current.detail && <> {current.detail}</>} <span className="muted">· {formatDate(current.date)}</span>
        {average && (
          <span className="chart-average muted">
            {average.label} {formatDecimal(average.values[index])} {unit}
          </span>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} over time, ${points.length} values`}
        tabIndex={0}
        onPointerDown={selectAt}
        onPointerMove={(e) => (e.buttons > 0 || e.pointerType === 'mouse' ? selectAt(e) : undefined)}
        onKeyDown={onKey}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {formatDecimal(t, 2)}
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
        {average &&
          points.map((p, i) => (
            <circle key={p.id} className="dot faint" cx={x(i)} cy={y(values[i])} r={i === index ? 4.5 : 3} />
          ))}
        <path className="line" d={path} />
        {(average ? lineValues : values).map((v, i) =>
          // With an average, only the selected point gets a marker on the line.
          average && i !== index ? null : (
            <circle
              key={points[i].id}
              className={i === index ? 'dot selected' : 'dot'}
              cx={x(i)}
              cy={y(v)}
              r={i === index ? 5.5 : 4}
            />
          ),
        )}
      </svg>
      {average && (
        <p className="chart-legend">
          <span>
            <span className="key-dot" aria-hidden="true" /> {label}
          </span>
          <span>
            <span className="key-line" aria-hidden="true" /> {average.label}
          </span>
        </p>
      )}
    </figure>
  )
}
