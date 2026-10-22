import type { GameState } from '../domain/types'

/**
 * Storage boundary for player progress. Async so a cloud implementation can replace
 * the local one without touching game rules or UI.
 */
export interface ProgressRepository {
  load(): Promise<GameState | null>
  save(state: GameState): Promise<void>
  clear(): Promise<void>
  /** Serialize a pure mutation against the latest persisted save, including across tabs. */
  update(fallback: () => GameState, change: (state: GameState) => GameState): Promise<GameState>
  /** Notifies when the stored state changes elsewhere (e.g. another tab). Returns an unsubscribe function. */
  subscribe(listener: (state: GameState | null) => void): () => void
}
