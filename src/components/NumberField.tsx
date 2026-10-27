import { useState } from 'react'
import { formatKg, parseNumber } from '../ui/format'

interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  label: string
  /** Whole numbers only (reps); otherwise decimals are allowed (kg). */
  integer?: boolean
}

/**
 * A number input that keeps the typed text (so "62," or "62.5" can be typed
 * step by step) and reports the parsed number. Uses a text input with
 * `inputMode` so phones show the numeric keypad.
 */
export function NumberField({ value, onChange, label, integer = false }: NumberFieldProps) {
  const [text, setText] = useState(formatKg(value))
  const [shown, setShown] = useState(value)
  const parsed = parseNumber(text)
  const valid = parsed !== null && (!integer || Number.isInteger(parsed))

  // Follow outside changes (e.g. a row removed above this one), but leave the
  // text alone if it already means the new value. React's recommended way to
  // adjust state when a prop changes.
  if (value !== shown) {
    setShown(value)
    if (parsed !== value) setText(formatKg(value))
  }

  return (
    <input
      className={`number-input${valid ? '' : ' invalid'}`}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={label}
      aria-invalid={!valid}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseNumber(e.target.value)
        if (n !== null && (!integer || Number.isInteger(n))) {
          setShown(n)
          onChange(n)
        }
      }}
    />
  )
}
