import {
  CONTINENT_TRAINING_STORAGE_KEY,
  CONTINENT_TRAINING_VERSION,
  parseContinentTraining,
  validateContinentTraining,
  type ContinentTrainingSession,
} from '../domain/continentTraining'

export interface ContinentTrainingRead {
  session: ContinentTrainingSession | null
  error: string | null
}

export class ContinentTrainingStore {
  constructor(private readonly storage?: Storage) {}

  read(): ContinentTrainingRead {
    let raw: string | null
    try {
      raw = (this.storage ?? window.localStorage).getItem(CONTINENT_TRAINING_STORAGE_KEY)
    } catch (error) {
      console.error('TerraDeck: could not read continent training data', error)
      return { session: null, error: 'Training data could not be read. Your saved data has not been changed.' }
    }
    if (raw === null) return { session: null, error: null }
    const result = parseContinentTraining(raw)
    if (result.error) console.warn('TerraDeck: continent training data was not changed', result.error)
    return result
  }

  write(session: ContinentTrainingSession): void {
    const validated = validateContinentTraining(session)
    if (!validated) throw new Error('Refusing to save invalid continent training data')
    if (this.read().error) throw new Error('Refusing to overwrite unreadable continent training data')
    const storage = this.storage ?? window.localStorage
    const raw = storage.getItem(CONTINENT_TRAINING_STORAGE_KEY)
    storage.setItem(CONTINENT_TRAINING_STORAGE_KEY, JSON.stringify({
      ...(raw === null ? {} : JSON.parse(raw)),
      version: CONTINENT_TRAINING_VERSION,
      session: validated,
    }))
  }

  clear(): void {
    if (this.read().error) throw new Error('Refusing to clear unreadable continent training data')
    ;(this.storage ?? window.localStorage).removeItem(CONTINENT_TRAINING_STORAGE_KEY)
  }
}
