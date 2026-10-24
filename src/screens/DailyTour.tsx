import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag } from '../components/Flag'
import { AtlasBack } from '../components/AtlasBack'
import { TourShare } from '../components/TourShare'
import { UnlockSequence } from '../components/UnlockSequence'
import { COUNTRY_BY_ID, COUNTRY_BY_MAP_NAME } from '../data/countries'
import { getDailyAssignment, type DailyRun } from '../domain/dailyTour'
import type { Game } from '../game/useGame'
import { tourShareText } from '../game/tourSharing'
import { useContent } from '../i18n/useContent'
import { ContinentMap, type MarkTone } from '../map/ContinentMap'
import { useWorld } from '../map/useWorld'

export function DailyTour({ game }: { game: Game }) {
  const { goToDaily, beginDailyTour } = game
  const { t, i18n } = useTranslation()
  const today = getDailyAssignment(game.now)
  const record = window.location.hash.split('/')[1] ?? ''
  const data = game.state.dailyTours
  const run = record === 'practice' ? (game.debug ? data?.practice : undefined)
    : data?.records[record || today?.dayKey || '']
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  const attemptedDay = useRef<string | null>(null)
  const dayKey = today?.dayKey
  useEffect(() => {
    if (run && !record) goToDaily(run.assignment.dayKey)
  }, [goToDaily, record, run])
  useEffect(() => {
    if (record || run || !dayKey || data?.blocked || attemptedDay.current === dayKey) return
    attemptedDay.current = dayKey
    void beginDailyTour().then(saved => {
      if (saved?.dailyTours?.records[dayKey]) goToDaily(dayKey)
    })
  }, [beginDailyTour, data?.blocked, dayKey, goToDaily, record, run])
  const home = <AtlasBack onClick={() => game.navigate('home')} />
  if (data?.blocked) return <div className="tour-summary"><p role="alert">{t('tour.storage')}</p>{home}</div>
  if (run) return <TourRun key={`${run.id}:${run.index}:${run.phase}`} game={game} run={run} />
  return (
    <div className="tour-summary">
      {home}
      <p className="eyebrow">{t('tour.title')}</p>
      <h1>{today ? t('tour.number', { number: today.number }) : t('tour.title')}</h1>
      {today ? <>
        <h2>{today.title[locale]}</h2>
        <button type="button" className="btn btn--primary" onClick={() => void game.beginDailyTour().then(saved => {
          if (saved?.dailyTours?.records[today.dayKey]) game.goToDaily(today.dayKey)
        })}>{t('tour.start')}</button>
      </> : <p>{t('tour.unavailable')}</p>}
    </div>
  )
}

function TourRun({ game, run }: { game: Game; run: DailyRun }) {
  const { t, i18n } = useTranslation()
  const { countryName, continentName } = useContent()
  const world = useWorld()
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  const { assignment } = run
  const title = assignment.title[locale]
  const back = () => game.navigate('home')
  const transact = async (action: () => ReturnType<Game['nextTourStop']>) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    try {
      await action()
      setSelected(null)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const label = run.practice ? t('tour.practice') : t('tour.number', { number: assignment.number })
  if (run.status === 'expired') return <div className="tour-summary"><AtlasBack onClick={back} /><h1>{label}</h1><p>{t('tour.expired')}</p>
    <button type="button" className="btn btn--primary" onClick={() => game.goToDaily()}>{t('tour.today')}</button>
  </div>

  if (run.phase === 'result') {
    const unlockId = run.pendingUnlockIds[0]
    const unlockCountry = unlockId ? COUNTRY_BY_ID[unlockId] : undefined
    return (
      <div className="tour-summary">
        <AtlasBack onClick={back} />
        <p className="eyebrow">{label}</p><h1>{title}</h1>
        <h2>{t('tour.score', { correct: run.correctCount, distance: run.totalKm })}</h2>
        <p>{t(run.practice ? 'tour.practiceHint' : run.correctCount === 5 ? 'tour.perfect' : 'tour.noReward')}</p>
        <ol className="tour-breakdown">{run.answers.map(answer => <li key={answer.targetId}>
          <span aria-hidden="true">{answer.correct ? '✓' : '×'}</span><Flag countryId={answer.targetId} />
          <span>{countryName(answer.targetId)}</span><strong>{answer.km} km</strong>
        </li>)}</ol>
        {!run.practice && run.correctCount === 5 && <ul>{assignment.countryIds.map(id =>
          <li key={id}>{t(run.rewards.stampedIds.includes(id) ? 'tour.reward' : 'tour.unchanged', { country: countryName(id) })}</li>)}</ul>}
        {!run.practice && <TourShare text={tourShareText(assignment.number, title, run.answers.map(answer => answer.correct), run.answers.map(answer => answer.km), locale)} />}
        <p className="tour-status">{t('tour.distance')}</p>
        <button type="button" className="btn btn--ghost" onClick={back}>{t('tour.back')}</button>
        {unlockId && unlockCountry && <UnlockSequence key={unlockId} country={unlockCountry}
          onContinue={() => void game.acknowledgeDailyUnlock(unlockId)}
          onCollection={() => void game.acknowledgeDailyUnlock(unlockId).then(saved => { if (saved) game.navigate('collection') })} />}
      </div>
    )
  }

  const targetId = assignment.countryIds[run.index]
  const target = targetId ? COUNTRY_BY_ID[targetId] : undefined
  if (!target) return <div className="tour-summary"><AtlasBack onClick={back} /><p role="alert">{t('tour.storage')}</p></div>
  const answer = run.phase === 'feedback' ? run.answers[run.index] : undefined
  const wrongCountry = answer && COUNTRY_BY_ID[answer.answerId]
  const marks: { mapName: string; tone: MarkTone }[] = answer ? [
    { mapName: target.mapName, tone: answer.correct ? 'correct' : 'target' },
    ...(!answer.correct && wrongCountry ? [{ mapName: wrongCountry.mapName, tone: 'wrong' as const }] : []),
  ] : []
  return (
    <div className="challenge daily-challenge">
      <header className="screen-bar">
        <AtlasBack onClick={back} />
        <div className="challenge-title"><span className="eyebrow">{label} · {continentName(assignment.continent)}</span><h1><Flag countryId={target.id} className="prompt-flag" />{t('tour.find', { country: countryName(target.id) })}</h1></div>
      </header>
      <div className="steps tour-stops" aria-label={t('tour.stop', { current: run.index + 1 })}>{assignment.countryIds.map((id, index) =>
        <span key={id} className={index === run.index ? 'is-current' : ''} aria-current={index === run.index ? 'step' : undefined}>{index < run.index ? '✓' : index + 1}</span>)}</div>
      <div className="challenge-map">
        {world ? <ContinentMap key={`${run.id}:${run.index}`} world={world} continent={assignment.continent}
          interactive={run.phase === 'answer' && !busy} selected={selected} onSelect={setSelected}
          marks={marks} focus={answer ? marks.map(mark => mark.mapName) : undefined}
          pulse={answer ? target.mapName : null} label={continentName(assignment.continent)} /> : <p>{t('common.loadingMap')}</p>}
      </div>
      <section className="sheet" aria-live="polite">
        <p className="eyebrow">{title} · {t('tour.stop', { current: run.index + 1 })}</p>
        {run.practice && <p className="sheet-prompt">{t('tour.practiceHint')}</p>}
        {answer ? <>
          <h2 className={`result-title ${answer.correct ? 'result-title--good' : 'result-title--miss'}`}>{t(answer.correct ? 'tour.correct' : 'tour.miss', { distance: answer.km })}</h2>
          <div className="tour-feedback"><Flag countryId={target.id} /><strong>{t('tour.answer', { country: countryName(target.id) })}</strong></div>
          <button type="button" className="btn btn--primary btn--wide" disabled={busy} onClick={() => void transact(() => game.nextTourStop(run.id, run.index))}>{t(run.index === 4 ? 'tour.finish' : 'tour.next')}</button>
        </> : <button type="button" className="btn btn--primary btn--wide" disabled={!selected || busy} onClick={() => {
          const id = selected && COUNTRY_BY_MAP_NAME[selected]?.id
          if (id) void transact(() => game.chooseTourCountry(id, run.id, run.index))
        }}>{t(busy ? 'tour.busy' : selected ? 'tour.confirm' : 'tour.select')}</button>}
      </section>
    </div>
  )
}
