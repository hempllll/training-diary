import { useState } from 'react'
import { formatKg, parseNumber } from '../ui/format'

interface NumberFieldProps {
  /** undefined = no value (only meaningful with `optional`). */
  value: number | undefined
  onChange: (value: number | undefined) => void
  label: string
  /** Whole numbers only (reps); otherwise decimals are allowed (kg). */
  integer?: boolean
  /** Empty input means "no value" (undefined) instead of 0. */
  optional?: boolean
  placeholder?: string
}

const show = (value: number | undefined) => (value === undefined ? '' : formatKg(value))

/**
 * A number input that keeps the typed text (so "62," or "62.5" can be typed
 * step by step) and reports the parsed number. Uses a text input with
 * `inputMode` so phones show the numeric keypad.
 */
export function NumberField({
  value,
  onChange,
  label,
  integer = false,
  optional = false,
  placeholder,
}: NumberFieldProps) {
  const [text, setText] = useState(show(value))
  const [shown, setShown] = useState(value)

  const parse = (t: string): number | undefined | null =>
    optional && t.trim() === '' ? undefined : parseNumber(t)
  const accepts = (n: number | undefined | null) =>
    n !== null && (n === undefined || !integer || Number.isInteger(n))
  const parsed = parse(text)
  const valid = accepts(parsed)

  // Follow outside changes (e.g. a row removed above this one), but leave the
  // text alone if it already means the new value. React's recommended way to
  // adjust state when a prop changes.
  if (value !== shown) {
    setShown(value)
    if (parsed !== value) setText(show(value))
  }

  return (
    <input
      className={`number-input${valid ? '' : ' invalid'}`}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={label}
      aria-invalid={!valid}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value)
        const n = parse(e.target.value)
        if (n !== null && accepts(n)) {
          setShown(n)
          onChange(n)
        }
      }}
    />
  )
}
