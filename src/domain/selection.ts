import type { CountryId, CountryProgress } from './types'

export type Rng = () => number

export function isCollected(progress: CountryProgress | undefined, stampsToUnlock: number): boolean {
  return (progress?.stamps ?? 0) >= stampsToUnlock
}

/**
 * Picks an uncollected country, avoiding the most recent ones when possible.
 * Returns null once every country is collected.
 */
export function pickCountry(
  rosterIds: readonly CountryId[],
  progress: Record<CountryId, CountryProgress>,
  recentIds: readonly CountryId[],
  rng: Rng,
  stampsToUnlock: number,
  recentWindow: number,
): CountryId | null {
  const pool = rosterIds.filter((id) => !isCollected(progress[id], stampsToUnlock))
  if (pool.length === 0) return null

  const window = Math.min(recentWindow, pool.length - 1)
  const avoid = new Set(window > 0 ? recentIds.filter((id) => pool.includes(id)).slice(-window) : [])
  const candidates = pool.filter((id) => !avoid.has(id))
  return candidates[Math.floor(rng() * candidates.length)] ?? null
}
