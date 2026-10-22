import type { GameState } from '../domain/types'
import type { ProgressRepository } from './ProgressRepository'
import { parseGameState } from './validate'

export const STORAGE_KEY = 'terradeck:save:v1'

export class LocalStorageRepository implements ProgressRepository {
  private memory: GameState | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private warnedAboutLocks = false
  private storageUnavailable = false
  constructor(
    private readonly storage?: Storage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  async load(): Promise<GameState | null> {
    if (this.storageUnavailable) return this.memory
    let raw: string | null
    try {
      raw = this.getStorage().getItem(this.key)
    } catch (error) {
      this.storageUnavailable = true
      console.warn('TerraDeck: could not load progress; playing in memory', error)
      return null
    }
    if (raw === null) return null
    const state = this.parse(raw)
    if (!state) this.backupCorrupt(raw)
    return state
  }

  async save(state: GameState): Promise<void> {
    this.memory = state
    try {
      this.getStorage().setItem(this.key, JSON.stringify(state))
    } catch (err) {
      this.storageUnavailable = true
      // Quota exceeded or storage disabled (e.g. some private modes): keep playing in memory.
      console.warn('TerraDeck: could not save progress', err)
    }
  }

  async clear(): Promise<void> {
    this.memory = null
    try {
      this.getStorage().removeItem(this.key)
    } catch (error) {
      console.warn('TerraDeck: could not clear saved progress', error)
    }
  }

  update(fallback: () => GameState, change: (state: GameState) => GameState): Promise<GameState> {
    const apply = async () => {
      const saved = await this.load()
      const before = saved ?? fallback()
      const next = change(before)
      if (!saved || next !== before) await this.save(next)
      this.memory = next
      return next
    }
    const run = async (): Promise<GameState> => {
      if (typeof navigator !== 'undefined' && navigator.locks) {
        return await navigator.locks.request(`${this.key}:mutation`, apply)
      }
      if (!this.warnedAboutLocks) {
        console.warn('TerraDeck: Web Locks unavailable; use only one tab to avoid concurrent save changes')
        this.warnedAboutLocks = true
      }
      return apply()
    }
    const result = this.queue.then(run)
    this.queue = result.catch((error: unknown) => {
      console.error('TerraDeck: progress transaction failed', error)
    })
    return result
  }

  subscribe(listener: (state: GameState | null) => void): () => void {
    const onStorage = (e: StorageEvent) => {
      if ((e.key !== this.key && e.key !== null) || e.storageArea !== this.getStorage()) return
      // Read the latest value: queued storage events can already be obsolete.
      void this.load().then(state => {
        this.memory = state
        listener(state)
      })
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
