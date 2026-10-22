import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { answerContinent, answerCountry, createInitialState, dismissChallenge, openPack, syncPacks } from '../domain/challenge'
import { DEBUG_CONFIG, DEFAULT_CONFIG } from '../domain/config'
import type { ContinentId, GameState } from '../domain/types'
import { COUNTRIES } from '../data/countries'
import { LocalStorageRepository, STORAGE_KEY } from '../persistence/LocalStorageRepository'
import type { ProgressRepository } from '../persistence/ProgressRepository'
import { prototypeState } from './prototypeState'
import { useNow } from './useNow'
import { mainHash, routeFromHash, type HelpSection, type MainScreen, type Route } from './navigation'

export type { MainScreen, Screen } from './navigation'

const params = () => new URLSearchParams(window.location.search)
export const isDebug = () => params().has('debug')
/** `?demo` plays on a separate save seeded with a partly filled atlas. */
export const isDemo = () => params().has('demo')

export function useGame() {
  const debug = useMemo(isDebug, [])
  const demo = useMemo(isDemo, [])
  const config = debug ? DEBUG_CONFIG : DEFAULT_CONFIG
  const repository = useMemo<ProgressRepository>(
    () => new LocalStorageRepository(undefined, demo ? `${STORAGE_KEY}:demo` : STORAGE_KEY),
    [demo],
  )
  const freshState = useCallback(
    () => (demo ? prototypeState(config, Date.now()) : createInitialState(config)),
    [demo, config],
  )
  const [state, setState] = useState<GameState>(() => createInitialState(config))
  const [loaded, setLoaded] = useState(false)
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash))
  const { screen, helpSection } = route
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
    const onHash = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])

  const navigate = useCallback((next: MainScreen, section?: HelpSection) => {
    const hash = mainHash(next, section)
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    setRoute(routeFromHash(hash))
  }, [])

  /** Shows the sealed pack (or the challenge in progress). Nothing is consumed yet. */
  const goToExpedition = useCallback(() => setRoute({ screen: 'expedition', helpSection: null }), [])

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
    navigate(next)
  }, [navigate])

  const addDebugPack = useCallback(
    () => setState((s) => ({ ...s, ...(s.packs + 1 >= config.maxPacks ? { packs: config.maxPacks, refillAt: null } : { packs: s.packs + 1 }) })),
    [config],
  )

  const resetProgress = useCallback(() => {
    void repository.clear()
    setState(freshState())
    navigate('home')
  }, [repository, freshState, navigate])

  return {
    state,
    loaded,
    screen,
    helpSection,
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
