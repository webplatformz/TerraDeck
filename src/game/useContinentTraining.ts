import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ContinentId } from '../domain/types'
import {
  CONTINENT_TRAINING_STORAGE_KEY,
  createContinentTraining,
  type ContinentTrainingSession,
} from '../domain/continentTraining'
import { ContinentTrainingStore } from '../persistence/ContinentTrainingStore'

type TrainingErrorKey = 'training.storageError' | 'training.saveError' | 'training.clearError'

export function useContinentTraining() {
  const store = useMemo(() => new ContinentTrainingStore(), [])
  const [snapshot, setSnapshot] = useState<{
    session: ContinentTrainingSession | null
    ready: boolean
    error: TrainingErrorKey | null
  }>(() => {
    const result = store.read()
    return {
      session: result.session,
      ready: true,
      error: result.error ? 'training.storageError' as const : null,
    }
  })

  const refresh = useCallback(() => {
    const result = store.read()
    setSnapshot({
      session: result.session,
      ready: true,
      error: result.error ? 'training.storageError' : null,
    })
  }, [store])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CONTINENT_TRAINING_STORAGE_KEY) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const save = useCallback((next: ContinentTrainingSession): boolean => {
    if (!snapshot.ready || snapshot.error === 'training.storageError') return false
    try {
      store.write(next)
      setSnapshot(current => ({ ...current, session: next, error: null }))
      return true
    } catch (cause) {
      console.error('TerraDeck: could not save continent training data', cause)
      setSnapshot(current => ({ ...current, error: 'training.saveError' }))
      return false
    }
  }, [snapshot.error, snapshot.ready, store])

  const start = useCallback((continent: ContinentId) => save(createContinentTraining(continent)), [save])
  const clear = useCallback((): boolean => {
    if (!snapshot.ready || snapshot.error === 'training.storageError') return false
    try {
      store.clear()
      setSnapshot(current => ({ ...current, session: null, error: null }))
      return true
    } catch (cause) {
      console.error('TerraDeck: could not clear continent training data', cause)
      setSnapshot(current => ({ ...current, error: 'training.clearError' }))
      return false
    }
  }, [snapshot.error, snapshot.ready, store])

  return { ...snapshot, save, start, clear }
}

export type ContinentTraining = ReturnType<typeof useContinentTraining>
