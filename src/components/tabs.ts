/** The three tabs of the bottom bar. */
export type Tab = 'home' | 'library' | 'stats'

/** Each tab's name as the bar shows it. Library holds exercises and plans. */
export const TAB_LABELS: Record<Tab, string> = {
  home: 'Training days',
  library: 'Library',
  stats: 'Stats',
}
