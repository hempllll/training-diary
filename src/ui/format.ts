import { dayNumber, type SetEntry } from '../diary'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Tue 27 Oct", with the year added when it isn't `currentYear`. */
export function formatDate(date: string, currentYear = new Date().getFullYear()): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  const text = `${weekday} ${d} ${MONTHS[m - 1]}`
  return y === currentYear ? text : `${text} ${y}`
}

/** A weight without trailing zeros: 60, 62.5, 0.25. */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 100) / 100)
}

/** A number with at most `digits` decimals: 82.4, 1.5, 3. */
export function formatDecimal(n: number, digits = 1): string {
  const f = 10 ** digits
  return String(Math.round(n * f) / f)
}

/** A change in kg with its sign: "+1.2 kg", "−0.8 kg", "±0 kg". */
export function formatChange(kg: number): string {
  const text = formatDecimal(Math.abs(kg))
  return `${text === '0' ? '±' : kg > 0 ? '+' : '−'}${text} kg`
}

/** Total weight moved: kg up to 10 t, then tonnes ("12.3 t"). */
export function formatVolume(kg: number): string {
  return kg < 10_000 ? `${Math.round(kg)} kg` : `${formatDecimal(kg / 1000)} t`
}

/** How long ago `date` was: "today", "yesterday", "3 days ago". */
export function daysAgo(date: string, today: string): string {
  const days = dayNumber(today) - dayNumber(date)
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

/**
 * Parse a number typed by the user, accepting a decimal comma ("62,5").
 * Empty input counts as 0; anything else unparseable or negative is null.
 */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return 0
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** A set's reps, with "f" when done to failure: "8f". */
const repsOf = (set: SetEntry) => `${set.reps}${set.failure ? 'f' : ''}`

/** One set as "10 @ 60 kg" (or "10 reps" without weight); "10f" if to failure. */
export function formatSet(set: SetEntry): string {
  return set.weight > 0 ? `${repsOf(set)} @ ${formatKg(set.weight)} kg` : `${repsOf(set)} reps`
}

/**
 * Sets in short form, one group per run of sets at the same weight, in the
 * order they were done: each set's reps, then the weight ("10 · 10 · 8 @ 60 kg").
 * Sets done to failure get an "f" ("12f · 11 · 8f @ 50 kg"); sets without
 * weight have no "@".
 */
export function setGroups(sets: SetEntry[]): string[] {
  const runs: SetEntry[][] = []
  for (const set of sets) {
    const run = runs.at(-1)
    if (run && run[0].weight === set.weight) run.push(set)
    else runs.push([set])
  }
  return runs.map((run) => {
    const { weight } = run[0]
    const reps = run.map(repsOf).join(' · ')
    return weight > 0 ? `${reps} @ ${formatKg(weight)} kg` : reps
  })
}

/** `setGroups` on one line: "12 @ 40 kg, 11 · 9 @ 50 kg". */
export function summarizeSets(sets: SetEntry[]): string {
  return sets.length === 0 ? 'No sets' : setGroups(sets).join(', ')
}

/** "1 exercise", "3 exercises". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** What a plan contains: "3 exercises", or "Rest day" when it has none. */
export function planSummary(exerciseCount: number): string {
  return exerciseCount === 0 ? 'Rest day' : plural(exerciseCount, 'exercise')
}

/** A readable message for anything thrown. */
export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
