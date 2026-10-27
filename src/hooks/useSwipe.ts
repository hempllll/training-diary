import { useRef, type TouchEvent } from 'react'

/** A swipe is quick and mostly sideways: at least this many px … */
const MIN_DISTANCE = 60
/** … within this many ms. */
const MAX_DURATION = 600

/** Touches here belong to the control, not to the page. */
const OWN_GESTURES = 'input, textarea, select, .backdrop, .tab-bar'

/** Whether a touch starts inside something that scrolls sideways itself. */
function inSidewaysScroller(el: Element | null): boolean {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true
  }
  return false
}

/**
 * Touch handlers that report a sideways swipe across the element: 1 for a
 * swipe to the left (on to the next page), -1 for one to the right. Vertical
 * scrolling is left alone, as are swipes that start in a field, a dialog or
 * a sideways scroller.
 */
export function useSwipe(onSwipe: (step: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null)
  return {
    onTouchStart(e: TouchEvent) {
      const target = e.target as Element
      const touch = e.touches[0]
      start.current =
        e.touches.length === 1 && !target.closest(OWN_GESTURES) && !inSidewaysScroller(target)
          ? { x: touch.clientX, y: touch.clientY, time: Date.now() }
          : null
    },
    onTouchEnd(e: TouchEvent) {
      const from = start.current
      start.current = null
      const touch = e.changedTouches[0]
      if (!from || !touch) return
      const dx = touch.clientX - from.x
      const dy = touch.clientY - from.y
      if (Date.now() - from.time <= MAX_DURATION && Math.abs(dx) >= MIN_DISTANCE && Math.abs(dx) > 2 * Math.abs(dy)) {
        onSwipe(dx < 0 ? 1 : -1)
      }
    },
    onTouchCancel() {
      start.current = null
    },
  }
}
