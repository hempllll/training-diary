import { plansOverview, type Diary, type PlanStats } from '../diary'
import { daysAgo, formatDate, formatDecimal, formatVolume, plural } from '../ui/format'
import { StatGrid, type Stat } from './StatGrid'

interface PlanStatsScreenProps {
  diary: Diary
  today: string
}

/** How often training days are tracked overall, and each plan's numbers. */
export function PlanStatsScreen({ diary, today }: PlanStatsScreenProps) {
  const overview = plansOverview(diary, today)
  if (overview.total === 0) {
    return (
      <section className="screen">
        <h2 className="visually-hidden">Plan stats</h2>
        <p className="notice">No training days tracked yet. Track one and its plan’s numbers show up here.</p>
      </section>
    )
  }

  return (
    <section className="screen">
      <h2 className="visually-hidden">Plan stats</h2>
      <StatGrid
        columns={3}
        stats={[
          { label: 'Training days', value: String(overview.total), sub: 'tracked' },
          { label: 'This week', value: String(overview.thisWeek), sub: 'since Monday' },
          { label: 'Per week', value: `${formatDecimal(overview.perWeek)}×`, sub: `in ${plural(overview.weeks, 'week')}` },
        ]}
      />
      <ul className="list">
        {overview.plans.map((p) => (
          <li key={p.id} className="card plan-stats">
            <h3 className="row-title">{p.name}</h3>
            {p.count === 0 ? (
              <p className="notice">Not tracked yet.</p>
            ) : (
              <StatGrid stats={planTiles(p, today)} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function planTiles(p: PlanStats, today: string): Stat[] {
  const tiles: Stat[] = [
    { label: 'Done', value: `${p.count}×`, sub: `since ${formatDate(p.first!)}` },
    { label: 'Last time', value: formatDate(p.last!), sub: daysAgo(p.last!, today) },
    { label: 'Per week', value: `${formatDecimal(p.perWeek!)}×`, sub: 'when done' },
    { label: 'Weeks', value: `${p.weeks} of ${p.weeksTracked}`, sub: 'tracked weeks' },
  ]
  if (p.gapDays !== undefined) tiles.push({ label: 'Every', value: `${formatDecimal(p.gapDays)} days`, sub: 'on average' })
  if (p.sets !== undefined) tiles.push({ label: 'Sets', value: formatDecimal(p.sets), sub: 'per time' })
  if (p.volume !== undefined) tiles.push({ label: 'Volume', value: formatVolume(p.volume), sub: 'per time' })
  if (p.swaps > 0) tiles.push({ label: 'Swaps', value: String(p.swaps), sub: 'exercises replaced or added' })
  return tiles
}
