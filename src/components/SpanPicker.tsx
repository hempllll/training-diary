import { SPANS, type Span } from '../diary'

/** Segmented buttons choosing how far back a chart goes (1M … All). */
export function SpanPicker({ span, onChange }: { span: Span; onChange: (span: Span) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Time span">
      {SPANS.map((s) => (
        <button key={s.id} type="button" aria-pressed={s.id === span} onClick={() => onChange(s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  )
}
