import type { GameConfig } from './config'

export interface PackStock {
  packs: number
  refillAt: number | null
}

/** Grants every pack that has arrived since `refillAt`, capped at `maxPacks`. */
export function reconcilePacks(stock: PackStock, now: number, config: GameConfig): PackStock {
  const { maxPacks, cooldownMs } = config
  if (stock.packs >= maxPacks) return { packs: maxPacks, refillAt: null }
  if (stock.refillAt === null) return { packs: stock.packs, refillAt: now + cooldownMs }
  if (now < stock.refillAt) return stock

  const arrived = 1 + Math.floor((now - stock.refillAt) / cooldownMs)
  const packs = Math.min(maxPacks, stock.packs + arrived)
  return {
    packs,
    refillAt: packs >= maxPacks ? null : stock.refillAt + arrived * cooldownMs,
  }
}
