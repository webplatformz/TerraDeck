import type { GameState } from '../domain/types'
import type { ProgressRepository } from './ProgressRepository'
import { parseGameState } from './validate'

export const STORAGE_KEY = 'terradeck:save:v1'

export class LocalStorageRepository implements ProgressRepository {
  constructor(
    private readonly storage?: Storage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  async load(): Promise<GameState | null> {
    let raw: string | null
    try {
      raw = this.getStorage().getItem(this.key)
    } catch (error) {
      console.warn('TerraDeck: could not load progress; playing in memory', error)
      return null
    }
    if (raw === null) return null
    const state = this.parse(raw)
    if (!state) this.backupCorrupt(raw)
    return state
  }

  async save(state: GameState): Promise<void> {
    try {
      this.getStorage().setItem(this.key, JSON.stringify(state))
    } catch (err) {
      // Quota exceeded or storage disabled (e.g. some private modes): keep playing in memory.
      console.warn('TerraDeck: could not save progress', err)
    }
  }

  async clear(): Promise<void> {
    try {
      this.getStorage().removeItem(this.key)
    } catch (error) {
      console.warn('TerraDeck: could not clear saved progress', error)
    }
  }

  subscribe(listener: (state: GameState | null) => void): () => void {
    const onStorage = (e: StorageEvent) => {
      if ((e.key !== this.key && e.key !== null) || e.storageArea !== this.getStorage()) return
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

  private getStorage(): Storage {
    return this.storage ?? window.localStorage
  }

  private backupCorrupt(raw: string) {
    try {
      this.getStorage().setItem(`${this.key}:corrupt:${Date.now()}`, raw)
    } catch {
      // Ignore: losing an unreadable save is acceptable.
    }
    try {
      this.getStorage().removeItem(this.key)
    } catch (error) {
      console.warn('TerraDeck: could not remove unreadable progress', error)
    }
  }
}
