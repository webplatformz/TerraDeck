export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]

/** Relative per-country weights, not tier drop percentages. */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 0.95,
  rare: 0.9,
  epic: 0.85,
  legendary: 0.8,
}

export function isRarity(value: string): value is Rarity {
  return RARITIES.some((rarity) => rarity === value)
}
