import type { CountryId, CountryProgress, RosterEntry } from './types'
import { RARITY_WEIGHTS, type Rarity } from './rarity'

export type Rng = () => number

export function isCollected(progress: CountryProgress | undefined, stampsToUnlock: number): boolean {
  return (progress?.stamps ?? 0) >= stampsToUnlock
}

/**
 * Picks an uncollected country, avoiding the most recent ones when possible.
 * Returns null once every country is collected.
 */
export function pickCountry(
  roster: readonly RosterEntry[],
  progress: Record<CountryId, CountryProgress>,
  recentIds: readonly CountryId[],
  rng: Rng,
  stampsToUnlock: number,
  recentWindow: number,
  weights: Readonly<Record<Rarity, number>> = RARITY_WEIGHTS,
): CountryId | null {
  const rosterIds = roster.map((entry) => entry.id)
  const pool = rosterIds.filter((id) => !isCollected(progress[id], stampsToUnlock))
  if (pool.length === 0) return null

  const window = Math.min(recentWindow, pool.length - 1)
  const avoid = new Set(window > 0 ? recentIds.filter((id) => pool.includes(id)).slice(-window) : [])
  const candidates = pool.filter((id) => !avoid.has(id))
  const weighted = candidates.map((id) => {
    const country = roster.find((entry) => entry.id === id)!
    const weight = weights[country.rarity]
    if (!Number.isFinite(weight) || weight <= 0) throw new Error(`Invalid draw weight for ${country.rarity}`)
    return { id, weight }
  })
  const random = rng()
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error('RNG must return a number in [0, 1)')
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let threshold = random * total
  for (const entry of weighted) {
    threshold -= entry.weight
    if (threshold < 0) return entry.id
  }
  // Floating-point rounding at the upper edge of [0, 1).
  return weighted[weighted.length - 1]!.id
}
