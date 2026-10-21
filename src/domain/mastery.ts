export const MASTERY_STAGES = [
  { id: 'visitor', numeral: 'I' },
  { id: 'explorer', numeral: 'II' },
] as const

export const MASTERY_STAMP_COUNT = MASTERY_STAGES.length

export function displayedStamps(stamps: number): number {
  return Math.min(stamps, MASTERY_STAMP_COUNT)
}
