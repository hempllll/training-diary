import { describe, expect, it } from 'vitest'
import {
  daysAgo,
  formatChange,
  formatDate,
  formatDecimal,
  formatKg,
  formatSet,
  formatVolume,
  parseNumber,
  setGroups,
  summarizeSets,
} from '../format'
import { niceTicks } from '../ticks'

describe('formatDate', () => {
  it('shows weekday, day and month, plus the year when it differs', () => {
    expect(formatDate('2026-10-27', 2026)).toBe('Tue 27 Oct')
    expect(formatDate('2025-01-03', 2026)).toBe('Fri 3 Jan 2025')
  })
})

describe('parseNumber', () => {
  it('accepts a decimal comma and treats empty as 0', () => {
    expect(parseNumber('62,5')).toBe(62.5)
    expect(parseNumber(' 10 ')).toBe(10)
    expect(parseNumber('')).toBe(0)
    expect(parseNumber('-3')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})

describe('summarizeSets', () => {
  it('lists the reps of each set, then the weight', () => {
    expect(summarizeSets([{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }])).toBe('10 · 10 @ 60 kg')
    expect(summarizeSets([{ weight: 70, reps: 10 }, { weight: 70, reps: 8 }])).toBe('10 · 8 @ 70 kg')
    expect(summarizeSets([{ weight: 62.5, reps: 8 }])).toBe('8 @ 62.5 kg')
  })

  it('marks sets done to failure with an f', () => {
    const sets = [
      { weight: 50, reps: 12, failure: true },
      { weight: 50, reps: 11 },
      { weight: 50, reps: 8, failure: true },
      { weight: 0, reps: 9, failure: true },
    ]
    expect(summarizeSets(sets)).toBe('12f · 11 · 8f @ 50 kg, 9f')
    expect(formatSet(sets[0])).toBe('12f @ 50 kg')
    expect(formatSet(sets[3])).toBe('9f reps')
  })

  it('has no weight for sets without one', () => {
    expect(summarizeSets([{ weight: 0, reps: 8 }, { weight: 0, reps: 7 }])).toBe('8 · 7')
  })

  it('groups runs of sets at the same weight, in order', () => {
    const sets = [
      { weight: 40, reps: 12 },
      { weight: 50, reps: 11 },
      { weight: 50, reps: 9 },
      { weight: 50, reps: 8 },
      { weight: 40, reps: 10 },
      { weight: 40, reps: 10 },
      { weight: 0, reps: 5 },
    ]
    expect(setGroups(sets)).toEqual(['12 @ 40 kg', '11 · 9 · 8 @ 50 kg', '10 · 10 @ 40 kg', '5'])
    expect(summarizeSets(sets)).toBe('12 @ 40 kg, 11 · 9 · 8 @ 50 kg, 10 · 10 @ 40 kg, 5')
  })
})

describe('formatKg', () => {
  it('drops trailing zeros and float noise', () => {
    expect(formatKg(60)).toBe('60')
    expect(formatKg(0.1 + 0.2)).toBe('0.3')
  })
})

describe('niceTicks', () => {
  it('covers the range with round steps', () => {
    expect(niceTicks(57.5, 82.5)).toEqual([50, 60, 70, 80, 90])
    expect(niceTicks(0, 1)).toEqual([0, 0.5, 1])
  })

  it('pads a flat range', () => {
    const ticks = niceTicks(60, 60)
    expect(ticks[0]).toBeLessThan(60)
    expect(ticks.at(-1)).toBeGreaterThan(60)
  })
})

describe('stats numbers', () => {
  it('round, sign and shorten', () => {
    expect(formatDecimal(82.36)).toBe('82.4')
    expect(formatDecimal(1.5)).toBe('1.5')
    expect(formatDecimal(3)).toBe('3')
    expect(formatChange(1.24)).toBe('+1.2 kg')
    expect(formatChange(-0.8)).toBe('−0.8 kg')
    expect(formatChange(0.01)).toBe('±0 kg')
    expect(formatVolume(9_876.4)).toBe('9876 kg')
    expect(formatVolume(12_345)).toBe('12.3 t')
  })

  it('say how long ago a date was', () => {
    expect(daysAgo('2026-10-28', '2026-10-28')).toBe('today')
    expect(daysAgo('2026-10-27', '2026-10-28')).toBe('yesterday')
    expect(daysAgo('2026-09-28', '2026-10-28')).toBe('30 days ago')
  })
})
