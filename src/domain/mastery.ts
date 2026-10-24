export const MASTERY_STAGES = [
  { id: 'visitor', numeral: 'I' },
  { id: 'explorer', numeral: 'II' },
] as const

export const MASTERY_STAMP_COUNT = MASTERY_STAGES.length

export function displayedStamps(stamps: number): number {
  return Math.min(stamps, MASTERY_STAMP_COUNT)
}

export function awardMasteryStamp(
  before: import('./types').CountryProgress, now: number, cap: number = MASTERY_STAMP_COUNT,
): { progress: import('./types').CountryProgress; unlocked: boolean; earned: boolean } {
  const stamps = before.stamps < cap ? Math.min(cap, before.stamps + 1) : before.stamps
  const unlocked = before.stamps < cap && stamps >= cap
  return {
    progress: { ...before, stamps, unlockedAt: unlocked ? now : before.unlockedAt },
    unlocked,
    earned: stamps > before.stamps,
  }
}
