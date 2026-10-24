import { useCallback, useEffect, useMemo, useState } from 'react'
import { answerContinent, answerCountry, createInitialState, dismissChallenge, openPack, syncPacks } from '../domain/challenge'
import { DEBUG_CONFIG, DEFAULT_CONFIG } from '../domain/config'
import type { ContinentId, GameState } from '../domain/types'
import { ALL_COUNTRIES, ARCHIVED_COUNTRIES, COUNTRIES } from '../data/countries'
import { LocalStorageRepository, STORAGE_KEY } from '../persistence/LocalStorageRepository'
import type { ProgressRepository } from '../persistence/ProgressRepository'
import { prototypeState } from './prototypeState'
import { useNow } from './useNow'
import { mainHash, routeFromHash, type HelpSection, type MainScreen, type Route } from './navigation'
import { acknowledgeAchievements, emptyAchievements, trackAchievements, type AchievementId } from '../domain/achievements'
import { addDebugPack as queueDebugPack } from '../domain/debug'
import { reconcileRoster } from '../domain/rosterUpdate'
import { resetCollection as clearCollection } from '../domain/resetCollection'
import { acknowledgeTourUnlock, advanceDailyTour, answerDailyTour, expireDailyTours, getDailyAssignment, getDailyRun, startDailyTour } from '../domain/dailyTour'

const removedIds = ARCHIVED_COUNTRIES.map(c => c.id)

export type { MainScreen, Screen } from './navigation'

const params = () => new URLSearchParams(window.location.search)
export const isDebug = () => params().has('debug')
/** `?demo` plays on a separate save seeded with a partly filled atlas. */
export const isDemo = () => params().has('demo')

export function useGame() {
  const debug = useMemo(() => isDebug(), [])
  const demo = useMemo(() => isDemo(), [])
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
  const [storageError, setStorageError] = useState(false)
  const mutate = useCallback((change: (state: GameState) => GameState) =>
    repository.update(freshState, saved => change(expireDailyTours(reconcileRoster(saved, removedIds, Date.now(), config), Date.now()))).then(next => {
      setState(next)
      return next
    }).catch((error: unknown) => {
      console.error('TerraDeck: could not update progress', error)
      setStorageError(true)
    }), [repository, freshState, config])

  useEffect(() => {
    let cancelled = false
    void repository.update(freshState, saved => {
      const synced = syncPacks(expireDailyTours(reconcileRoster(saved, removedIds, Date.now(), config), Date.now()), Date.now(), config)
      return synced.achievements ? synced : { ...synced, achievements: emptyAchievements() }
    }).then((saved) => {
      if (cancelled) return
      setState(saved)
      setLoaded(true)
    }).catch((error: unknown) => {
      console.error('TerraDeck: could not initialize progress', error)
      setStorageError(true)
    })
    return () => {
      cancelled = true
    }
  }, [repository, freshState, config])

  useEffect(
    () =>
      repository.subscribe(() => {
        // Refresh under the same queue as local actions so delayed events cannot restore stale UI.
        void mutate(s => syncPacks(s, Date.now(), config))
      }),
    [repository, freshState, mutate, config],
  )

  useEffect(() => {
    if (loaded && state.refillAt !== null && state.refillAt <= now) void mutate(s => syncPacks(s, now, config))
  }, [now, config, loaded, mutate, state.refillAt])

  useEffect(() => {
    const expired = Object.values(state.dailyTours?.records ?? {}).some(run => run.status === 'active' && run.assignment.expiresAt <= now)
    if (loaded && expired) void mutate(s => expireDailyTours(s, Date.now()))
  }, [loaded, now, state.dailyTours, mutate])

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === 'visible') void mutate(s => expireDailyTours(s, Date.now()))
    }
    document.addEventListener('visibilitychange', resume)
    return () => document.removeEventListener('visibilitychange', resume)
  }, [mutate])

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
  const goToDaily = useCallback((record = '') => {
    const hash = record ? `#daily/${encodeURIComponent(record)}` : '#daily'
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
    setRoute({ screen: 'daily', helpSection: null })
  }, [])
  const beginDailyTour = useCallback(() => mutate(s => startDailyTour(s, Date.now())), [mutate])
  const resetDailyTour = useCallback(() => {
    if (!debug) return Promise.resolve(undefined)
    return mutate(s => {
      const today = getDailyAssignment(Date.now())
      if (!today || !s.dailyTours || s.dailyTours.blocked) return s
      const records = { ...s.dailyTours.records }
      delete records[today.dayKey]
      return { ...s, dailyTours: { ...s.dailyTours, records } }
    })
  }, [debug, mutate])
  const chooseTourCountry = useCallback((answer: string, runId: string, index: number) =>
    mutate(s => answerDailyTour(s, answer, runId, index, Date.now())), [mutate])
  const nextTourStop = useCallback((runId: string, index: number) =>
    mutate(s => getDailyRun(s, runId)?.index === index ? advanceDailyTour(s, runId, Date.now()) : s), [mutate])
  const acknowledgeDailyUnlock = useCallback((id: string) =>
    mutate(s => acknowledgeTourUnlock(s, id)), [mutate])

  const ripPack = useCallback(
    () => {
      const at = Date.now()
      void mutate(s => {
        const target = debug && COUNTRIES.some(c => c.id === s.debugCountryId) ? s.debugCountryId : undefined
        const opened = openPack(s, COUNTRIES, at, Math.random, config, target)
        const next = target && !s.activeChallenge && opened.activeChallenge ? { ...opened, debugCountryId: undefined } : opened
        return trackAchievements(s, next, COUNTRIES, at)
      })
    }, [config, mutate, debug],
  )

  const chooseContinent = useCallback(
    (continent: ContinentId) => {
      const expected = state.activeChallenge
      const at = Date.now()
      void mutate(s => {
        if (s.activeChallenge?.countryId !== expected?.countryId || s.activeChallenge?.startedAt !== expected?.startedAt) return s
        return trackAchievements(s, answerContinent(s, continent, COUNTRIES, at, config), COUNTRIES, at)
      })
    }, [config, mutate, state.activeChallenge],
  )

  const chooseCountry = useCallback(
    (answer: string) => {
      const expected = state.activeChallenge
      const at = Date.now()
      void mutate(s => {
        if (s.activeChallenge?.countryId !== expected?.countryId || s.activeChallenge?.startedAt !== expected?.startedAt) return s
        return trackAchievements(s, answerCountry(s, answer, at, config), COUNTRIES, at)
      })
    }, [config, mutate, state.activeChallenge],
  )

  const finishExpedition = useCallback((next: MainScreen = 'home') => {
    const expected = state.activeChallenge
    void mutate(s => s.activeChallenge?.startedAt === expected?.startedAt && s.activeChallenge?.countryId === expected?.countryId ? dismissChallenge(s) : s)
      .then(saved => { if (saved) navigate(next) })
  }, [navigate, mutate, state.activeChallenge])

  const addDebugPack = useCallback(
    (code = '') => {
      if (!debug) return
      return mutate(s => queueDebugPack(s, code, COUNTRIES, config))
    }, [config, mutate, debug],
  )

  const resetProgress = useCallback(() => {
    void mutate(() => ({ ...freshState(), achievements: emptyAchievements() })).then(saved => { if (saved) navigate('home') })
  }, [freshState, navigate, mutate])
  const resetCollection = useCallback((continent: ContinentId | 'all') =>
    mutate(s => clearCollection(s, ALL_COUNTRIES, continent, Date.now(), config)), [mutate, config])

  const acknowledgeBadges = useCallback((ids: readonly AchievementId[]) =>
    mutate(s => acknowledgeAchievements(s, ids)), [mutate])
  const dismissRosterNotice = useCallback(() =>
    mutate(s => s.rosterNotice ? { ...s, rosterNotice: undefined } : s), [mutate])

  return {
    state,
    loaded,
    storageError,
    singleTabOnly: typeof navigator !== 'undefined' && !navigator.locks,
    notificationLock: `${STORAGE_KEY}${demo ? ':demo' : ''}:achievement-notification`,
    acknowledgeBadges,
    dismissRosterNotice,
    screen,
    helpSection,
    now,
    config,
    debug,
    navigate,
    goToExpedition,
    goToDaily,
    beginDailyTour,
    resetDailyTour,
    chooseTourCountry,
    nextTourStop,
    acknowledgeDailyUnlock,
    ripPack,
    chooseContinent,
    chooseCountry,
    finishExpedition,
    addDebugPack,
    resetProgress,
    resetCollection,
  }
}

export type Game = ReturnType<typeof useGame>
