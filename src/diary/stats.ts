/**
 * Statistics derived from tracked workouts: body weight over time, progress
 * per exercise, and how often each plan is done. Pure functions; dates are
 * local `YYYY-MM-DD` strings like everywhere else.
 */
import { dayFilters, sortedExercises, sortWorkouts } from './diary'
import type { Diary, SetEntry, Workout } from './types'

// --- dates -----------------------------------------------------------------

const DAY_MS = 86_400_000

/** Whole days since 1970 for a `YYYY-MM-DD` date (UTC, so DST can't shift it). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/** The date `days` days after `date` (before, if negative). */
export function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10)
}

/** The Monday of the week `date` falls in. */
export function weekStart(date: string): string {
  // 1 Jan 1970 was a Thursday, so (day number + 3) % 7 counts from Monday.
  return addDays(date, -((dayNumber(date) + 3) % 7))
}

// --- time spans --------------------------------------------------------------

export type Span = '1m' | '3m' | '6m' | '1y' | 'all'

export const SPANS: { id: Span; label: string; months?: number }[] = [
  { id: '1m', label: '1M', months: 1 },
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: 'all', label: 'All' },
]

/** The first date inside `span` up to `today`, or null for all time. */
export function spanStart(span: Span, today: string): string | null {
  const months = SPANS.find((s) => s.id === span)?.months
  if (!months) return null
  const [y, m, d] = today.split('-').map(Number)
  // Date.UTC rolls over (31 Mar - 1 month = 3 Mar), which is fine for a chart.
  return new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10)
}

/** The items dated inside `span`. */
export function inSpan<T extends { date: string }>(items: T[], span: Span, today: string): T[] {
  const start = spanStart(span, today)
  return start === null ? items : items.filter((i) => i.date >= start)
}

// --- body weight -------------------------------------------------------------

/** Body weight on one date (the mean, if it was entered more than once). */
export interface WeighIn {
  date: string
  kg: number
}

/** How many days the body weight average covers. */
export const AVERAGE_DAYS = 7

/** Every date a body weight was entered, oldest first. */
export function bodyWeights(workouts: Workout[]): WeighIn[] {
  const byDate = new Map<string, number[]>()
  for (const w of workouts) {
    if (w.bodyWeight === undefined) continue
    byDate.set(w.date, [...(byDate.get(w.date) ?? []), w.bodyWeight])
  }
  return [...byDate]
    .map(([date, kgs]) => ({ date, kg: mean(kgs) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The mean of the weigh-ins in the `AVERAGE_DAYS` days up to `date`, or null. */
export function averageUpTo(weighIns: WeighIn[], date: string): number | null {
  const end = dayNumber(date)
  const recent = weighIns.filter((w) => {
    const day = dayNumber(w.date)
    return day <= end && day > end - AVERAGE_DAYS
  })
  return recent.length === 0 ? null : mean(recent.map((w) => w.kg))
}

/** The moving average at each weigh-in (`averageUpTo` its date), same order. */
export function movingAverage(weighIns: WeighIn[]): number[] {
  return weighIns.map((w) => averageUpTo(weighIns, w.date)!)
}

// --- exercises ---------------------------------------------------------------

/** Epley estimate of the one-rep max: weight × (1 + reps / 30). */
export function epley(set: SetEntry): number {
  if (set.reps <= 0) return 0
  return set.reps === 1 ? set.weight : set.weight * (1 + set.reps / 30)
}

/** Reps from `min` to `max`, both included. */
export interface RepRange {
  min: number
  max: number
}

export const DEFAULT_REP_RANGE: RepRange = { min: 8, max: 12 }

/** All sets of an exercise in one workout. */
export interface Session {
  workoutId: string
  date: string
  dayName: string
  sets: SetEntry[]
}

/** Every workout an exercise was done in (with sets), oldest first. */
export function sessionsOf(workouts: Workout[], exerciseId: string): Session[] {
  const sessions: Session[] = []
  for (const w of sortWorkouts(workouts).reverse()) {
    const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
    if (sets.length > 0) sessions.push({ workoutId: w.id, date: w.date, dayName: w.dayName, sets })
  }
  return sessions
}

/** The best set of a session for a chart, and the session it is from. */
export interface TrendPoint {
  workoutId: string
  date: string
  set: SetEntry
}

/** Heavier wins; at the same weight, more reps. */
const better = (a: SetEntry, b: SetEntry) => a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps)

/**
 * Per session, the heaviest set with reps inside `range` (sessions without
 * one are left out), oldest first.
 */
export function weightTrend(sessions: Session[], range: RepRange): TrendPoint[] {
  const lo = Math.min(range.min, range.max)
  const hi = Math.max(range.min, range.max)
  return sessions.flatMap(({ workoutId, date, sets }) => {
    const inRange = sets.filter((s) => s.reps >= lo && s.reps <= hi)
    if (inRange.length === 0) return []
    const set = inRange.reduce((a, s) => (better(s, a) ? s : a))
    return [{ workoutId, date, set }]
  })
}

/** Per session, the set with the most reps (for exercises without weight). */
export function repsTrend(sessions: Session[]): TrendPoint[] {
  return sessions.map(({ workoutId, date, sets }) => ({
    workoutId,
    date,
    set: sets.reduce((a, s) => (s.reps > a.reps ? s : a)),
  }))
}

export interface ExerciseStats {
  sessions: number
  sets: number
  reps: number
  /** Total weight moved: sum of weight × reps (kg). */
  volume: number
  first: string
  last: string
  /** Sessions per week, counting only the weeks it was done in. */
  perWeek: number
  /** Heaviest set (most reps at that weight) and when. */
  heaviest: { set: SetEntry; date: string }
  /** Best estimated one-rep max and when. */
  bestE1rm: { kg: number; date: string }
  /** True when every set was without weight (bodyweight exercises). */
  bodyweightOnly: boolean
}

/** Totals and records over all sessions, or null if it was never done. */
export function exerciseStats(sessions: Session[]): ExerciseStats | null {
  if (sessions.length === 0) return null
  const all = sessions.flatMap((s) => s.sets.map((set) => ({ set, date: s.date })))
  const heaviest = all.reduce((a, x) => (better(x.set, a.set) ? x : a))
  const bestE1rm = all.reduce((a, x) => (epley(x.set) > epley(a.set) ? x : a))
  return {
    sessions: sessions.length,
    sets: all.length,
    reps: all.reduce((sum, x) => sum + x.set.reps, 0),
    volume: all.reduce((sum, x) => sum + x.set.weight * x.set.reps, 0),
    first: sessions[0].date,
    last: sessions.at(-1)!.date,
    perWeek: sessions.length / weeksOf(sessions).size,
    heaviest,
    bestE1rm: { kg: epley(bestE1rm.set), date: bestE1rm.date },
    bodyweightOnly: all.every((x) => x.set.weight === 0),
  }
}

/**
 * The exercises to offer in the stats: every current exercise (by name), plus
 * deleted ones that are still in tracked workouts (under their last name).
 */
export function exerciseChoices(diary: Diary): { id: string; name: string }[] {
  const choices = sortedExercises(diary.exercises).map((e) => ({ id: e.id, name: e.name }))
  const known = new Set(choices.map((c) => c.id))
  for (const w of sortWorkouts(diary.workouts)) {
    for (const e of w.entries) {
      if (known.has(e.exerciseId)) continue
      known.add(e.exerciseId)
      choices.push({ id: e.exerciseId, name: `${e.exerciseName} (deleted)` })
    }
  }
  return choices
}

/** The exercise done most recently, for the stats to start with. */
export function lastTrainedExercise(workouts: Workout[]): string | null {
  for (const w of sortWorkouts(workouts)) {
    const entry = w.entries.find((e) => e.sets.length > 0)
    if (entry) return entry.exerciseId
  }
  return null
}

// --- plans -------------------------------------------------------------------

export interface PlanStats {
  id: string
  name: string
  /** Times tracked. */
  count: number
  first?: string
  last?: string
  /** Times per week, counting only the weeks it was done in. */
  perWeek?: number
  /** Weeks it was done in … */
  weeks: number
  /** … out of the weeks with any tracked training day since it was first done. */
  weeksTracked: number
  /** Mean days from one time to the next (needs two). */
  gapDays?: number
  /** Mean sets and volume (kg) per time; missing for rest days. */
  sets?: number
  volume?: number
  /** Exercises replaced or added while tracking it, over all times. */
  swaps: number
}

export interface PlansOverview {
  /** Training days tracked, of any plan. */
  total: number
  /** Weeks with at least one tracked training day. */
  weeks: number
  /** Training days per week, counting only those weeks. */
  perWeek: number
  /** Training days tracked in the week of `today`. */
  thisWeek: number
  /** One per plan: current plans in their order, then deleted ones that were tracked. */
  plans: PlanStats[]
}

export function plansOverview(diary: Diary, today: string): PlansOverview {
  const workouts = sortWorkouts(diary.workouts).reverse()
  const allWeeks = weeksOf(workouts)
  const plans = dayFilters(diary).map(({ id, name }): PlanStats => {
    const done = workouts.filter((w) => w.dayId === id)
    if (done.length === 0) return { id, name, count: 0, weeks: 0, weeksTracked: 0, swaps: 0 }
    const first = done[0].date
    const weeks = weeksOf(done).size
    const sets = done.map((w) => w.entries.flatMap((e) => e.sets))
    const trained = sets.some((s) => s.length > 0)
    return {
      id,
      name,
      count: done.length,
      first,
      last: done.at(-1)!.date,
      perWeek: done.length / weeks,
      weeks,
      weeksTracked: [...allWeeks].filter((week) => week >= weekStart(first)).length,
      gapDays: done.length > 1 ? (dayNumber(done.at(-1)!.date) - dayNumber(first)) / (done.length - 1) : undefined,
      sets: trained ? mean(sets.map((s) => s.length)) : undefined,
      volume: trained ? mean(sets.map((s) => s.reduce((sum, x) => sum + x.weight * x.reps, 0))) : undefined,
      swaps: done.reduce((n, w) => n + w.entries.filter((e) => e.replaces || e.extra).length, 0),
    }
  })
  const thisWeek = weekStart(today)
  return {
    total: workouts.length,
    weeks: allWeeks.size,
    perWeek: allWeeks.size === 0 ? 0 : workouts.length / allWeeks.size,
    thisWeek: workouts.filter((w) => weekStart(w.date) === thisWeek && w.date <= today).length,
    plans,
  }
}

// --- helpers -----------------------------------------------------------------

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** The weeks (by their Monday) the dated items fall in. */
function weeksOf(items: { date: string }[]): Set<string> {
  return new Set(items.map((i) => weekStart(i.date)))
}
