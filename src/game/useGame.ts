import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { answerContinent, answerCountry, createInitialState, dismissChallenge, openPack, syncPacks } from '../domain/challenge'
import { DEBUG_CONFIG, DEFAULT_CONFIG } from '../domain/config'
import type { ContinentId, GameState } from '../domain/types'
import { COUNTRIES } from '../data/countries'
import { LocalStorageRepository, STORAGE_KEY } from '../persistence/LocalStorageRepository'
import type { ProgressRepository } from '../persistence/ProgressRepository'
import { prototypeState } from './prototypeState'
import { useNow } from './useNow'

export type MainScreen = 'home' | 'collection' | 'about'
export type Screen = MainScreen | 'expedition'

const MAIN_SCREENS: readonly MainScreen[] = ['home', 'collection', 'about']

function screenFromHash(): MainScreen {
  const hash = window.location.hash.slice(1)
  return (MAIN_SCREENS as readonly string[]).includes(hash) ? (hash as MainScreen) : 'home'
}

const params = () => new URLSearchParams(window.location.search)
export const isDebug = () => params().has('debug')
/** `?demo` plays on a separate save seeded with a partly filled atlas. */
export const isDemo = () => params().has('demo')

export function useGame() {
  const debug = useMemo(isDebug, [])
  const demo = useMemo(isDemo, [])
  const config = debug ? DEBUG_CONFIG : DEFAULT_CONFIG
  const repository = useMemo<ProgressRepository>(
    () => new LocalStorageRepository(window.localStorage, demo ? `${STORAGE_KEY}:demo` : STORAGE_KEY),
    [demo],
  )
  const freshState = useCallback(
    () => (demo ? prototypeState(config, Date.now()) : createInitialState(config)),
    [demo, config],
  )
  const [state, setState] = useState<GameState>(() => createInitialState(config))
  const [loaded, setLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>(screenFromHash)
  const now = useNow(1000)
  // Set when the current state came from storage (another tab), so it isn't written straight back.
  const fromStorage = useRef(false)

  useEffect(() => {
    let cancelled = false
    void repository.load().then((saved) => {
      if (cancelled) return
      setState(syncPacks(saved ?? freshState(), Date.now(), config))
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [repository, freshState, config])

  useEffect(
    () =>
      repository.subscribe((external) => {
        fromStorage.current = true
        setState(external ?? freshState())
      }),
    [repository, freshState],
  )

  useEffect(() => {
    if (!loaded) return
    if (fromStorage.current) {
      fromStorage.current = false
      return
    }
    void repository.save(state)
  }, [state, loaded, repository])

  useEffect(() => {
    if (loaded) setState((s) => syncPacks(s, now, config))
  }, [now, config, loaded])

  useEffect(() => {
    const onHash = () => setScreen((current) => (current === 'expedition' ? current : screenFromHash()))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (screen === 'expedition') return
    const hash = `#${screen}`
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  }, [screen])

  const navigate = useCallback((next: MainScreen) => setScreen(next), [])

  /** Shows the sealed pack (or the challenge in progress). Nothing is consumed yet. */
  const goToExpedition = useCallback(() => setScreen('expedition'), [])

  const ripPack = useCallback(
    () => setState((s) => openPack(s, COUNTRIES, Date.now(), Math.random, config)),
    [config],
  )

  const chooseContinent = useCallback(
    (continent: ContinentId) => setState((s) => answerContinent(s, continent, COUNTRIES, Date.now(), config)),
    [config],
  )

  const chooseCountry = useCallback(
    (answer: string) => setState((s) => answerCountry(s, answer, Date.now(), config)),
    [config],
  )

  const finishExpedition = useCallback((next: MainScreen = 'home') => {
    setState(dismissChallenge)
    setScreen(next)
  }, [])

  const addDebugPack = useCallback(
    () => setState((s) => ({ ...s, ...(s.packs + 1 >= config.maxPacks ? { packs: config.maxPacks, refillAt: null } : { packs: s.packs + 1 }) })),
    [config],
  )

  const resetProgress = useCallback(() => {
    void repository.clear()
    setState(freshState())
    setScreen('home')
  }, [repository, freshState])

  return {
    state,
    loaded,
    screen,
    now,
    config,
    debug,
    navigate,
    goToExpedition,
    ripPack,
    chooseContinent,
    chooseCountry,
    finishExpedition,
    addDebugPack,
    resetProgress,
  }
}

export type Game = ReturnType<typeof useGame>
