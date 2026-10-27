import type { SetEntry } from '../diary'

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

/** One set as "60 kg × 10" (or "10 reps" without weight). */
export function formatSet(set: SetEntry): string {
  return set.weight > 0 ? `${formatKg(set.weight)} kg × ${set.reps}` : `${set.reps} reps`
}

/**
 * Sets in short form: "3 × 10 @ 60 kg" when all sets match, "10 · 10 · 8 @ 60 kg"
 * when only the weight does, otherwise each set listed ("60×10 · 55×8", in kg).
 */
export function summarizeSets(sets: SetEntry[]): string {
  if (sets.length === 0) return 'No sets'
  const first = sets[0]
  if (sets.every((s) => s.weight === first.weight)) {
    const at = first.weight > 0 ? ` @ ${formatKg(first.weight)} kg` : ''
    const reps = sets.every((s) => s.reps === first.reps)
      ? `${sets.length} × ${first.reps}`
      : sets.map((s) => s.reps).join(' · ')
    return reps + at
  }
  return sets.map((s) => (s.weight > 0 ? `${formatKg(s.weight)}×${s.reps}` : `${s.reps}`)).join(' · ')
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
