/** About four round-numbered gridlines covering [min, max]. */
export function niceTicks(min: number, max: number): number[] {
  if (max === min) {
    const pad = Math.max(1, Math.abs(max) * 0.1)
    min -= pad
    max += pad
  }
  const raw = (max - min) / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= raw)!
  const ticks: number[] = []
  for (let t = Math.floor(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(t)
  if (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step)
  return ticks.map((t) => Math.round(t * 1000) / 1000)
}
