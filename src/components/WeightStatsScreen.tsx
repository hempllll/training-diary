import {
  AVERAGE_DAYS,
  averageUpTo,
  bodyWeights,
  inSpan,
  movingAverage,
  type Diary,
  type Span,
} from '../diary'
import { formatChange, formatDate, formatDecimal } from '../ui/format'
import { LineChart } from './LineChart'
import { SpanPicker } from './SpanPicker'
import { StatGrid, type Stat } from './StatGrid'

interface WeightStatsScreenProps {
  diary: Diary
  today: string
  span: Span
  onSpanChange: (span: Span) => void
  /** Draw the moving average as the line, the weigh-ins as dots. */
  showAverage: boolean
  onShowAverageChange: (show: boolean) => void
}

const kg = (n: number) => `${formatDecimal(n)} kg`
const AVERAGE_LABEL = `${AVERAGE_DAYS}-day average`

/** Body weight (entered while tracking) over time, with its weekly average. */
export function WeightStatsScreen({
  diary,
  today,
  span,
  onSpanChange,
  showAverage,
  onShowAverageChange,
}: WeightStatsScreenProps) {
  const all = bodyWeights(diary.workouts)
  if (all.length === 0) {
    return (
      <section className="screen">
        <h2 className="visually-hidden">Body weight</h2>
        <p className="notice">No body weight yet. Enter it when you track a training day and it shows up here.</p>
      </section>
    )
  }

  // The average is worked out on all weigh-ins, so the first ones in the
  // span still average over the days before it.
  const averages = movingAverage(all)
  const shown = inSpan(
    all.map((w, i) => ({ ...w, average: averages[i] })),
    span,
    today,
  )
  const latest = all.at(-1)!
  const week = averageUpTo(all, today)

  const stats: Stat[] = [
    {
      label: `Last ${AVERAGE_DAYS} days`,
      value: week === null ? '–' : kg(week),
      sub: week === null ? 'no weigh-in' : 'average',
    },
    { label: 'Latest', value: kg(latest.kg), sub: formatDate(latest.date) },
  ]
  if (shown.length > 0) {
    const values = shown.map((w) => w.kg)
    const lowest = shown.find((w) => w.kg === Math.min(...values))!
    const highest = shown.find((w) => w.kg === Math.max(...values))!
    stats.push(
      { label: 'Change', value: formatChange(shown.at(-1)!.kg - shown[0].kg), sub: `since ${formatDate(shown[0].date)}` },
      { label: 'Weigh-ins', value: String(shown.length), sub: span === 'all' ? 'all time' : 'in this span' },
      { label: 'Lowest', value: kg(lowest.kg), sub: formatDate(lowest.date) },
      { label: 'Highest', value: kg(highest.kg), sub: formatDate(highest.date) },
    )
  }

  return (
    <section className="screen">
      <h2 className="visually-hidden">Body weight</h2>
      <SpanPicker span={span} onChange={onSpanChange} />
      <div className="chips">
        <button type="button" aria-pressed={showAverage} onClick={() => onShowAverageChange(!showAverage)}>
          {AVERAGE_LABEL}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="notice">No weigh-ins in this time span.</p>
      ) : (
        <LineChart
          points={shown.map((w) => ({ id: w.date, date: w.date, value: w.kg }))}
          label="Body weight"
          unit="kg"
          average={showAverage ? { values: shown.map((w) => w.average), label: AVERAGE_LABEL } : undefined}
        />
      )}
      <StatGrid stats={stats} />
    </section>
  )
}
