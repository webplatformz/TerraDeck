import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StampRow } from '../components/Stamp'
import { Flag } from '../components/Flag'
import { UnlockSequence } from '../components/UnlockSequence'
import { CONTINENTS } from '../data/continents'
import { COUNTRY_BY_ID, COUNTRY_BY_MAP_NAME } from '../data/countries'
import type { WorldData } from '../data/world'
import type { ContinentId } from '../domain/types'
import { displayedStamps } from '../domain/mastery'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'
import { ContinentMap, type MarkTone } from '../map/ContinentMap'
import { ContinentPicker, type ContinentVerdict } from '../map/ContinentPicker'

/** How long a correct continent stays green before the country step opens. */
export const CONTINENT_FEEDBACK_MS = 700

/** Country and continent names inside challenge texts are wrapped in <name>…</name>. */
const PLACE = { name: <em className="place" /> }

const answerFromMapName = (mapName: string) => COUNTRY_BY_MAP_NAME[mapName]?.id ?? `map:${mapName}`
const mapNameFromAnswer = (answer: string) => (answer.startsWith('map:') ? answer.slice(4) : COUNTRY_BY_ID[answer]?.mapName)

function AnswerPlace({ countryId, label, tone, single = false }: {
  countryId: string
  label: string
  tone: 'correct' | 'wrong'
  single?: boolean
}) {
  const { countryName } = useContent()
  return (
    <div className={`answer-place answer-place--${tone}${single ? ' answer-place--single' : ''}`}>
      <span className="answer-place-label">{label}</span>
      <Flag countryId={countryId} />
      <strong>{countryName(countryId)}</strong>
    </div>
  )
}

export function Challenge({ game, world }: { game: Game; world: WorldData }) {
  const challenge = game.state.activeChallenge!
  const country = COUNTRY_BY_ID[challenge.countryId]!
  const progress = game.state.progress[country.id]
  const [selected, setSelected] = useState<string | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)
  // The answer is saved right away; the verdict only keeps the continent step on screen for feedback.
  const [verdict, setVerdict] = useState<ContinentVerdict | null>(null)
  const verdictRef = useRef(verdict)
  const feedbackTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(feedbackTimer.current), [])
  const step = verdict ? 'continent' : challenge.step
  const { outcome } = challenge
  const { t } = useTranslation()
  const { countryName, continentName } = useContent()
  const name = countryName(country.id)
  const stamps = displayedStamps(progress?.stamps ?? 0)

  const marks: { mapName: string; tone: MarkTone }[] = []
  const focus: string[] = []
  if (step === 'result') {
    marks.push({ mapName: country.mapName, tone: outcome === 'stamp' ? 'correct' : 'target' })
    focus.push(country.mapName)
    const picked = challenge.countryAnswer && mapNameFromAnswer(challenge.countryAnswer)
    if (picked && picked !== country.mapName) {
      marks.push({ mapName: picked, tone: 'wrong' })
      focus.push(picked)
    }
  }
  const wrongContinent = step === 'result' && challenge.continentAnswer !== country.continent
  const wrongAnswer = step === 'result' && outcome === 'missed' && !wrongContinent && challenge.countryAnswer
    ? COUNTRY_BY_ID[challenge.countryAnswer] ?? COUNTRY_BY_MAP_NAME[mapNameFromAnswer(challenge.countryAnswer) ?? '']
    : undefined

  const answerContinent = (id: ContinentId) => {
    if (verdictRef.current || challenge.step !== 'continent') return
    const correct = id === country.continent
    const next = { id, correct }
    verdictRef.current = next
    setVerdict(next)
    game.chooseContinent(id)
    if (correct) feedbackTimer.current = window.setTimeout(() => {
      verdictRef.current = null
      setVerdict(null)
    }, CONTINENT_FEEDBACK_MS)
  }
  const continentBtnClass = (id: ContinentId) =>
    `continent-btn${verdict?.id === id ? (verdict.correct ? ' is-correct' : ' is-wrong') : ''}`

  return (
    <div className="challenge">
      <header className="screen-bar">
        <button type="button" className="icon-btn" onClick={() => game.navigate('home')} aria-label={t('common.backToAtlas')}>
          ×
        </button>
        <div className="challenge-title">
          <span className="eyebrow">{t('challenge.find')}</span>
          <h1>{name}</h1>
        </div>
        <StampRow stamps={progress?.stamps ?? 0} code={country.id} size={22} />
      </header>

      <ol className="steps" aria-label={t('challenge.progress')}>
        <li className={step === 'continent' ? 'is-current' : 'is-done'}>{t('challenge.stepContinent')}</li>
        <li className={step === 'country' ? 'is-current' : step === 'result' && !wrongContinent ? 'is-done' : ''}>{t('challenge.stepCountry')}</li>
      </ol>

      <div className="challenge-map">
        {step === 'continent' ? (
          <ContinentPicker world={world} onPick={answerContinent} verdict={verdict} />
        ) : (
          <ContinentMap
            world={world}
            continent={country.continent}
            interactive={step === 'country'}
            selected={step === 'country' ? selected : null}
            marks={marks}
            pulse={step === 'result' ? country.mapName : null}
            focus={focus.length ? focus : undefined}
            label={continentName(country.continent)}
            onSelect={setSelected}
          />
        )}
      </div>

      <section className="sheet" aria-live="polite">
        {step === 'continent' && (
          <>
            {verdict?.correct ? (
              <p className="sheet-prompt sheet-prompt--good">
                <Trans i18nKey="challenge.continentRight" values={{ continent: continentName(verdict.id) }} components={PLACE} />
              </p>
            ) : (
              <p className="sheet-prompt">
                <Trans i18nKey="challenge.promptContinent" values={{ country: name }} components={PLACE} />
              </p>
            )}
            <div className="continent-grid">
              {CONTINENTS.map((c) => (
                <button key={c.id} type="button" className={continentBtnClass(c.id)} disabled={!!verdict} onClick={() => answerContinent(c.id)}>
                  {verdict?.id === c.id && <span aria-hidden="true">{verdict.correct ? '✓ ' : '✕ '}</span>}
                  {continentName(c.id)}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'country' && (
          <>
            <p className="sheet-prompt">
              <Trans i18nKey="challenge.promptCountry" values={{ country: name }} components={PLACE} />
            </p>
            <button type="button" className="btn btn--primary btn--wide" disabled={!selected} onClick={() => selected && game.chooseCountry(answerFromMapName(selected))}>
              {selected ? t('challenge.confirm') : t('challenge.select')}
            </button>
          </>
        )}

        {step === 'result' && outcome === 'stamp' && (
          <>
            <p className="result-title result-title--good">{t('challenge.stampEarned', { stage: t(stamps === 1 ? 'stamp.visitor' : 'stamp.explorer') })}</p>
            <AnswerPlace countryId={country.id} label={t('challenge.countryFound')} tone="correct" single />
            <StampRow stamps={progress?.stamps ?? 0} code={country.id} size={52} fresh={(progress?.stamps ?? 1) - 1} />
            <p className="sheet-prompt">
              {challenge.unlocked ? (
                <Trans i18nKey="challenge.unlocked" values={{ country: name }} components={PLACE} />
              ) : (
                t(stamps >= game.config.stampsToUnlock ? 'challenge.alreadyCollected' : 'challenge.stampProgress', { stamps, total: game.config.stampsToUnlock })
              )}
            </p>
            {challenge.unlocked ? (
              <button type="button" className="btn btn--primary btn--wide" onClick={() => setShowUnlock(true)}>
                {t('challenge.revealCard')}
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--wide" onClick={() => game.finishExpedition()}>
                {t('common.backToTheAtlas')}
              </button>
            )}
          </>
        )}

        {step === 'result' && outcome === 'missed' && (
          <>
            <p className="result-title result-title--miss">{t('challenge.notQuite')}</p>
            {wrongAnswer && (
              <div className="answer-comparison">
                <AnswerPlace countryId={wrongAnswer.id} label={t('challenge.youSelected')} tone="wrong" />
                <AnswerPlace countryId={country.id} label={t('challenge.correctCountry')} tone="correct" />
              </div>
            )}
            {!wrongAnswer && (
              <AnswerPlace countryId={country.id} label={t('challenge.correctCountry')} tone="correct" single />
            )}
            <p className="sheet-prompt">
              {wrongContinent ? (
                <Trans
                  i18nKey="challenge.wrongContinent"
                  values={{ country: name, correct: continentName(country.continent), wrong: continentName(challenge.continentAnswer!) }}
                  components={PLACE}
                />
              ) : (
                <Trans i18nKey="challenge.wrongCountry" values={{ country: name }} components={PLACE} />
              )}{' '}
              {t('challenge.stampsSafe', { stamps, total: game.config.stampsToUnlock })}
            </p>
            <button type="button" className="btn btn--primary btn--wide" onClick={() => game.finishExpedition()}>
              {t('common.backToTheAtlas')}
            </button>
          </>
        )}
      </section>

      {verdict && !verdict.correct && (
        <div className="verdict-overlay">
          <div className="verdict-card" role="alertdialog" aria-modal="true" aria-labelledby="verdict-title" aria-describedby="verdict-body">
            <span className="verdict-seal" aria-hidden="true">
              ✕
            </span>
            <h2 id="verdict-title" className="result-title result-title--miss">
              {t('challenge.wrongContinentTitle')}
            </h2>
            <p id="verdict-body" className="sheet-prompt">
              <Trans i18nKey="challenge.wrongContinentBody" values={{ country: name, wrong: continentName(verdict.id) }} components={PLACE} />
            </p>
            <button type="button" className="btn btn--primary btn--wide" autoFocus onClick={() => setVerdict(null)}>
              {t('challenge.showAnswer')}
            </button>
          </div>
        </div>
      )}

      {showUnlock && <UnlockSequence country={country} onCollection={() => game.finishExpedition('collection')} onContinue={() => game.finishExpedition()} />}
    </div>
  )
}
