import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { AtlasBack } from '../components/AtlasBack'
import { Flag } from '../components/Flag'
import { GeographicClue } from '../components/GeographicClue'
import { CircleIcon } from '../components/CircleIcon'
import { CONTINENTS } from '../data/continents'
import { COUNTRY_BY_ID, COUNTRY_BY_MAP_NAME } from '../data/countries'
import { continentTrainingCountryIds, explorerKnowledgePercent, recordContinentTrainingGuess } from '../domain/continentTraining'
import type { ContinentTraining } from '../game/useContinentTraining'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'
import { ContinentMap, type MarkTone } from '../map/ContinentMap'
import { useWorld } from '../map/useWorld'

interface Props {
  game: Game
  training: ContinentTraining
}

export function ContinentTrainingScreen({ game, training }: Props) {
  const world = useWorld()
  const { t } = useTranslation()
  const { countryName, continentName } = useContent()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [mapSelection, setMapSelection] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [wrongMapName, setWrongMapName] = useState<string | null>(null)
  const [pulseMapName, setPulseMapName] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      setWrongMapName(null)
      setPulseMapName(null)
    }, feedback === 'correct' ? 1100 : 650)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const session = training.session
  const allIds = session ? continentTrainingCountryIds(session.continent) : []
  const placed = session?.placedIds ?? []
  const remaining = allIds.filter(id => !placed.includes(id))
  const total = allIds.length
  const knowledge = explorerKnowledgePercent(session?.streak ?? 0, total)
  const complete = !!session && remaining.length === 0
  const target = targetId ? COUNTRY_BY_ID[targetId] : undefined
  const marks: { mapName: string; tone: MarkTone }[] = [
    ...placed.map(id => ({ mapName: COUNTRY_BY_ID[id]!.mapName, tone: 'correct' as const })),
    ...(wrongMapName ? [{ mapName: wrongMapName, tone: 'wrong' as const }] : []),
  ]

  const leave = () => game.navigate('home')
  const clearTraining = () => {
    if (training.clear()) {
      setConfirmClear(false)
      leave()
    }
  }
  const selectTarget = (id: string) => {
    setTargetId(id)
    setMapSelection(null)
    setHintVisible(false)
    setFeedback(null)
    setWrongMapName(null)
    setPulseMapName(null)
  }
  const cancelTarget = () => {
    setTargetId(null)
    setMapSelection(null)
    setHintVisible(false)
    setFeedback(null)
    setWrongMapName(null)
    setPulseMapName(null)
  }
  const confirmPlacement = () => {
    if (!session || !target || !mapSelection) return
    const selectedCountry = COUNTRY_BY_MAP_NAME[mapSelection]
    const result = recordContinentTrainingGuess(session, target.id, selectedCountry?.id)
    if (result.correct) {
      if (training.save(result.session)) {
        setTargetId(null)
        setMapSelection(null)
        setHintVisible(false)
        setFeedback('correct')
        setPulseMapName(target.mapName)
      }
      return
    }
    setWrongMapName(mapSelection)
    setTargetId(null)
    setMapSelection(null)
    setHintVisible(false)
    setFeedback('wrong')
    if (!training.save({ ...session, streak: 0 })) setFeedback(null)
  }

  return (
    <div className="continent-training">
      <header className="screen-bar">
        <AtlasBack onClick={leave} />
        <span className="screen-bar-title">{t('training.title')}</span>
        <span className="tour-beta">{t('training.beta')}</span>
      </header>

      {training.error && <p className="training-error" role="alert">{t(training.error)}</p>}

      {!training.ready ? (
        <div className="training-start"><p className="hint">{t('training.loading')}</p></div>
      ) : training.error === 'training.storageError' ? (
        <div className="training-start"><p className="hint">{t('training.unavailable')}</p></div>
      ) : !session ? (
        <section className="training-start">
          <div className="training-intro">
            <p className="eyebrow">{t('training.eyebrow')}</p>
            <h1>{t('training.chooseContinent')}</h1>
            <p>{t('training.intro')}</p>
          </div>
          <div className="training-continent-grid">
            {CONTINENTS.map(continent => (
              <button
                type="button"
                key={continent.id}
                className="training-continent panel interactive-tile"
                onClick={() => training.start(continent.id)}
              >
                <span>{continentName(continent.id)}</span>
                <span className="training-chevron" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      ) : complete ? (
        <section className={`training-complete${session.streak === total ? ' is-perfect' : ''}`} aria-live="polite">
          <div className="training-complete-seal" aria-hidden="true">{session.streak === total ? '✦' : '✓'}</div>
          <p className="eyebrow">{t('training.completeEyebrow')}</p>
          <h1>{t('training.congratulations')}</h1>
          <p>{t('training.completeMessage', { continent: continentName(session.continent) })}</p>
          {world && (
            <div className="training-complete-map">
              <ContinentMap
                world={world}
                continent={session.continent}
                interactive={false}
                marks={marks}
                label={continentName(session.continent)}
              />
            </div>
          )}
          {session.streak === total && <p className="training-ultra">{t('training.ultraPower')}</p>}
          <div className="training-complete-actions">
            <button type="button" className="btn btn--primary btn--wide" onClick={() => {
              setTargetId(null)
              setMapSelection(null)
              setHintVisible(false)
              setFeedback(null)
              setWrongMapName(null)
              setPulseMapName(null)
              training.start(session.continent)
            }}>
              {t('training.trainAgain')}
            </button>
            <button type="button" className="btn btn--ghost btn--wide" onClick={() => setConfirmClear(true)}>
              {t('training.closeTraining')}
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="training-summary">
            <div className="training-summary-title">
              <div>
                <p className="eyebrow">{t('training.eyebrow')}</p>
                <h1>{continentName(session.continent)}</h1>
              </div>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmClear(true)}>
                {t('training.cancel')}
              </button>
            </div>
            <div className="training-metrics">
              <div className="training-metric">
                <div className="training-progress-copy">
                  <span>{t('training.continentProgress')}</span>
                  <strong>{placed.length} / {total}</strong>
                </div>
                <div className="training-progress" role="progressbar" aria-label={t('training.continentProgress')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={placed.length}>
                  <span className="training-progress-fill" style={{ width: `${total ? placed.length / total * 100 : 0}%` }} />
                </div>
              </div>
              <div className={`training-metric training-metric--knowledge${knowledge > 0 ? ' is-active' : ''}${knowledge === 100 ? ' is-full' : ''}`} style={{
                '--streak-energy': knowledge / 100,
                '--streak-pulse-duration': `${2.8 - knowledge / 100 * 1.6}s`,
              } as CSSProperties}>
                <div className="training-streak-copy">
                  <span><span className="training-energy-icon" aria-hidden="true">✦</span> {t('training.explorerKnowledge')}</span>
                  <span>{t('training.streakCount', { count: session.streak })}</span>
                </div>
                <div className="training-streak" role="progressbar" aria-label={t('training.explorerKnowledge')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={knowledge}>
                  <span className="training-streak-fill" style={{ width: `${knowledge}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="training-map">
            {world ? (
              <ContinentMap
                world={world}
                continent={session.continent}
                interactive={!!target}
                selected={mapSelection}
                marks={marks}
                pulse={pulseMapName}
                label={continentName(session.continent)}
                countryNames={placed.map(id => ({ mapName: COUNTRY_BY_ID[id]!.mapName, name: countryName(id) }))}
                onSelect={setMapSelection}
              />
            ) : <div className="map-frame"><div className="map-loading">{t('common.loadingMap')}</div></div>}
          </div>

          <section className={`training-sheet${target ? ' training-sheet--selected' : ''}`} aria-live="polite">
            {feedback && (
              <p className={`training-feedback training-feedback--${feedback}`} role="status">
                <span aria-hidden="true">{feedback === 'correct' ? '✓' : '✕'}</span>
                {t(feedback === 'correct' ? 'training.correct' : 'training.wrong')}
              </p>
            )}
            {target ? (
              <div className="training-target">
                <div className="training-target-heading">
                  <p>{t('training.placeCountry')}</p>
                  <strong><Flag countryId={target.id} />{countryName(target.id)}</strong>
                  <button type="button" className="circle-control training-country-cancel" onClick={cancelTarget} aria-label={t('training.chooseAnotherCountry')} title={t('training.chooseAnotherCountry')}>
                    <CircleIcon icon="close" />
                  </button>
                </div>
                <button type="button" className="training-hint-toggle" aria-expanded={hintVisible} onClick={() => setHintVisible(value => !value)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
                    <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                  {t(hintVisible ? 'training.hideHint' : 'training.revealHint')}
                </button>
                {hintVisible && (
                  <div className="training-hint">
                    {world && <GeographicClue country={target} world={world} />}
                  </div>
                )}
                <button type="button" className="btn btn--primary btn--wide" disabled={!mapSelection} onClick={confirmPlacement}>
                  {mapSelection ? t('training.confirmPlacement') : t('training.selectLocation')}
                </button>
              </div>
            ) : (
              <div className="training-country-picker">
                <div className="training-list-heading">
                  <p>{t('training.chooseCountry')}</p>
                  <span>{t('training.remainingCount', { count: remaining.length })}</span>
                </div>
                <div className="training-country-list">
                  {remaining.map(id => (
                    <button type="button" key={id} className="training-country interactive-tile" onClick={() => selectTarget(id)}>
                      <Flag countryId={id} />
                      <span>{countryName(id)}</span>
                      <span className="training-chevron" aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {confirmClear && session && (
        <div className="training-modal-backdrop">
          <section className="training-modal" role="alertdialog" aria-modal="true" aria-labelledby="training-modal-title" aria-describedby="training-modal-body">
            <h2 id="training-modal-title">{t(complete ? 'training.confirmCloseTitle' : 'training.confirmCancelTitle')}</h2>
            <p id="training-modal-body">{t(complete ? 'training.confirmCloseBody' : 'training.confirmCancelBody')}</p>
            <div className="training-modal-actions">
              <button type="button" className="btn btn--ghost" autoFocus onClick={() => setConfirmClear(false)}>{t('common.continue')}</button>
              <button type="button" className="btn btn--primary" onClick={clearTraining}>{t(complete ? 'training.confirmClose' : 'training.confirmCancel')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
