import { MASTERY_STAMP_COUNT } from './mastery'

export interface GameConfig {
  cooldownMs: number
  maxPacks: number
  stampsToUnlock: number
  recentWindow: number
}

export const DEFAULT_CONFIG: GameConfig = {
  cooldownMs: 15 * 60 * 1000,
  maxPacks: 5,
  stampsToUnlock: MASTERY_STAMP_COUNT,
  recentWindow: 3,
}

export const DEBUG_CONFIG: GameConfig = {
  ...DEFAULT_CONFIG,
  cooldownMs: 10 * 1000,
}
