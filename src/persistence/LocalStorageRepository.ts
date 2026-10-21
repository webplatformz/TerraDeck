import type { GameState } from '../domain/types'
import type { ProgressRepository } from './ProgressRepository'
import { parseGameState } from './validate'

export const STORAGE_KEY = 'terradeck:save:v1'

export class LocalStorageRepository implements ProgressRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  async load(): Promise<GameState | null> {
    const raw = this.storage.getItem(this.key)
    if (raw === null) return null
    const state = this.parse(raw)
    if (!state) this.backupCorrupt(raw)
    return state
  }

  async save(state: GameState): Promise<void> {
    try {
      this.storage.setItem(this.key, JSON.stringify(state))
    } catch (err) {
      // Quota exceeded or storage disabled (e.g. some private modes): keep playing in memory.
      console.warn('TerraDeck: could not save progress', err)
    }
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key)
  }

  subscribe(listener: (state: GameState | null) => void): () => void {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== this.storage || (e.key !== this.key && e.key !== null)) return
      listener(e.newValue === null ? null : this.parse(e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  private parse(raw: string): GameState | null {
    try {
      return parseGameState(JSON.parse(raw))
    } catch {
      return null
    }
  }

  private backupCorrupt(raw: string) {
    try {
      this.storage.setItem(`${this.key}:corrupt:${Date.now()}`, raw)
    } catch {
      // Ignore: losing an unreadable save is acceptable.
    }
    this.storage.removeItem(this.key)
  }
}
