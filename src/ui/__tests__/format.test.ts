import { describe, expect, it } from 'vitest'
import { formatDate, formatKg, parseNumber, summarizeSets } from '../format'
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
  it('collapses identical sets', () => {
    expect(summarizeSets([{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }])).toBe('2 × 10 @ 60 kg')
    expect(summarizeSets([{ weight: 0, reps: 12 }])).toBe('1 × 12')
  })

  it('lists reps once when only the weight matches', () => {
    expect(summarizeSets([{ weight: 70, reps: 10 }, { weight: 70, reps: 8 }])).toBe('10 · 8 @ 70 kg')
    expect(summarizeSets([{ weight: 0, reps: 8 }, { weight: 0, reps: 7 }])).toBe('8 · 7')
  })

  it('lists differing sets', () => {
    expect(summarizeSets([{ weight: 62.5, reps: 8 }, { weight: 60, reps: 10 }, { weight: 0, reps: 5 }])).toBe(
      '62.5×8 · 60×10 · 5',
    )
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
