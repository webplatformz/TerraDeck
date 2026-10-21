import type { GameConfig } from '../domain/config'
import { createInitialState } from '../domain/challenge'
import type { GameState } from '../domain/types'

/** Milestone 1 only: a partly filled atlas so every screen has something to show. */
export function prototypeState(config: GameConfig, now: number): GameState {
  const done = (daysAgo: number) => ({ stamps: 3, encounters: 4, unlockedAt: now - daysAgo * 86_400_000 })
  return {
    ...createInitialState(config),
    packs: 3,
    refillAt: now + Math.round(config.cooldownMs * 0.4),
    progress: {
      fr: done(6),
      jp: done(3),
      br: done(1),
      it: { stamps: 2, encounters: 3, unlockedAt: null },
      ke: { stamps: 2, encounters: 2, unlockedAt: null },
      ca: { stamps: 2, encounters: 2, unlockedAt: null },
      pe: { stamps: 2, encounters: 3, unlockedAt: null },
      nz: { stamps: 2, encounters: 2, unlockedAt: null },
      in: { stamps: 1, encounters: 2, unlockedAt: null },
      eg: { stamps: 1, encounters: 1, unlockedAt: null },
      mx: { stamps: 0, encounters: 1, unlockedAt: null },
    },
    recentIds: ['br', 'mx'],
  }
}
