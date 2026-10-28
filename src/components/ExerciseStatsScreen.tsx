import {
  exerciseChoices,
  exerciseStats,
  inSpan,
  lastTrainedExercise,
  repsTrend,
  sessionsOf,
  weightTrend,
  type Diary,
  type RepRange,
  type Session,
  type Span,
} from '../diary'
import { daysAgo, formatDate, formatDecimal, formatKg, formatSet, formatVolume, summarizeSets } from '../ui/format'
import { LineChart } from './LineChart'
import { NumberField } from './NumberField'
import { SpanPicker } from './SpanPicker'
import { StatGrid, type Stat } from './StatGrid'

interface ExerciseStatsScreenProps {
  diary: Diary
  today: string
  /** The exercise shown; null starts with the one done most recently. */
  exerciseId: string | null
  onExerciseChange: (id: string) => void
  range: RepRange
  onRangeChange: (range: RepRange) => void
  span: Span
  onSpanChange: (span: Span) => void
}

/**
 * One exercise's progress: the heaviest weight lifted for a chosen number of
 * reps over time (most reps for exercises without weight), totals and
 * records, and every session.
 */
export function ExerciseStatsScreen({
  diary,
  today,
  exerciseId,
  onExerciseChange,
  range,
  onRangeChange,
  span,
  onSpanChange,
}: ExerciseStatsScreenProps) {
  const choices = exerciseChoices(diary)
  const id = choices.some((c) => c.id === exerciseId)
    ? exerciseId!
    : (lastTrainedExercise(diary.workouts) ?? choices[0]?.id)
  if (!id) {
    return (
      <section className="screen">
        <h2 className="visually-hidden">Exercise stats</h2>
        <p className="notice">No exercises yet. Add some in the Library and track them to see their progress.</p>
      </section>
    )
  }

  const sessions = sessionsOf(diary.workouts, id)
  const stats = exerciseStats(sessions)

  return (
    <section className="screen">
      <h2 className="visually-hidden">Exercise stats</h2>
      <label className="field">
        <span className="field-label">Exercise</span>
        <select className="text-input" value={id} onChange={(e) => onExerciseChange(e.target.value)}>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {!stats ? (
        <p className="notice">Not tracked yet. Its progress shows up here once it is.</p>
      ) : (
        <>
          <Trend
            sessions={sessions}
            bodyweightOnly={stats.bodyweightOnly}
            range={range}
            onRangeChange={onRangeChange}
            span={span}
            onSpanChange={onSpanChange}
            today={today}
          />
          <StatGrid
            stats={[
              { label: 'Done', value: `${stats.sessions}×`, sub: `${formatDecimal(stats.perWeek)}× a week when done` },
              { label: 'Last time', value: formatDate(stats.last), sub: daysAgo(stats.last, today) },
              ...(stats.bodyweightOnly
                ? []
                : ([
                    { label: 'Heaviest set', value: formatSet(stats.heaviest.set), sub: formatDate(stats.heaviest.date) },
                    { label: 'Best est. 1RM', value: `${formatDecimal(stats.bestE1rm.kg)} kg`, sub: formatDate(stats.bestE1rm.date) },
                  ] satisfies Stat[])),
              { label: 'Sets', value: String(stats.sets), sub: `${formatDecimal(stats.sets / stats.sessions)} per time` },
              { label: 'Reps', value: String(stats.reps), sub: `${formatDecimal(stats.reps / stats.sets)} per set` },
              ...(stats.bodyweightOnly
                ? []
                : [{ label: 'Volume', value: formatVolume(stats.volume), sub: `${formatVolume(stats.volume / stats.sessions)} per time` }]),
              { label: 'First time', value: formatDate(stats.first), sub: daysAgo(stats.first, today) },
            ]}
          />

          <h3 className="section-title">History</h3>
          <ul className="list">
            {[...sessions].reverse().map((s) => (
              <li key={s.workoutId} className="row static">
                <span className="row-main">
                  <span className="row-title">
                    {formatDate(s.date)} <span className="muted">· {s.dayName}</span>
                  </span>
                  <span className="row-sub">{summarizeSets(s.sets)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

interface TrendProps {
  sessions: Session[]
  bodyweightOnly: boolean
  range: RepRange
  onRangeChange: (range: RepRange) => void
  span: Span
  onSpanChange: (span: Span) => void
  today: string
}

/** The chart with its controls: rep range (for weighted exercises) and time span. */
function Trend({ sessions, bodyweightOnly, range, onRangeChange, span, onSpanChange, today }: TrendProps) {
  const lo = Math.min(range.min, range.max)
  const hi = Math.max(range.min, range.max)
  const trend = inSpan(bodyweightOnly ? repsTrend(sessions) : weightTrend(sessions, range), span, today)
  const points = trend.map((p) =>
    bodyweightOnly
      ? { id: p.workoutId, date: p.date, value: p.set.reps }
      : { id: p.workoutId, date: p.date, value: p.set.weight, detail: `× ${p.set.reps}` },
  )

  return (
    <>
      {bodyweightOnly ? (
        <h3 className="section-title">Most reps in a set</h3>
      ) : (
        <div className="rep-range">
          <h3 className="section-title">Heaviest set with</h3>
          <NumberField
            integer
            label="Fewest reps"
            value={range.min}
            onChange={(min) => onRangeChange({ ...range, min: min ?? 0 })}
          />
          <span aria-hidden="true">–</span>
          <NumberField
            integer
            label="Most reps"
            value={range.max}
            onChange={(max) => onRangeChange({ ...range, max: max ?? 0 })}
          />
          <span>reps</span>
        </div>
      )}
      <SpanPicker span={span} onChange={onSpanChange} />
      {points.length === 0 ? (
        <p className="notice">
          {bodyweightOnly
            ? 'Not done in this time span.'
            : `No sets with ${lo === hi ? lo : `${lo}–${hi}`} reps${span === 'all' ? ' yet' : ' in this time span'}.`}
        </p>
      ) : (
        <LineChart
          points={points}
          label={bodyweightOnly ? 'Most reps' : `Heaviest set with ${lo}–${hi} reps`}
          unit={bodyweightOnly ? 'reps' : 'kg'}
        />
      )}
      {!bodyweightOnly && points.length > 0 && (
        <p className="notice">
          Best: {formatKg(Math.max(...points.map((p) => p.value)))} kg with {lo}–{hi} reps
          {span === 'all' ? '' : ' in this time span'}.
        </p>
      )}
    </>
  )
}
