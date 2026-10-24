import { Trans, useTranslation } from 'react-i18next'
import { useState } from 'react'
import { LanguageSelect } from '../components/LanguageSelect'
import { PackArt } from '../components/PackArt'
import { COUNTRIES } from '../data/countries'
import { useContent } from '../i18n/useContent'
import { ACHIEVEMENT_IDS } from '../domain/achievements'
import type { Game } from '../game/useGame'
import { DailyTourPanel } from '../components/DailyTourPanel'

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function Home({ game }: { game: Game }) {
  const { state, now, config } = game
  const { t } = useTranslation()
  const { countryName } = useContent()
  const [debugCode, setDebugCode] = useState('')
  const [debugInvalid, setDebugInvalid] = useState(false)
  const collected = COUNTRIES.filter((c) => (state.progress[c.id]?.stamps ?? 0) >= config.stampsToUnlock).length
  const stamps = COUNTRIES.reduce((sum, c) => sum + Math.min(config.stampsToUnlock, state.progress[c.id]?.stamps ?? 0), 0)
  const totalStamps = COUNTRIES.length * config.stampsToUnlock
  const achievementsEarned = ACHIEVEMENT_IDS.filter(id => state.achievements?.earned[id]).length
  const complete = collected === COUNTRIES.length
  const active = state.activeChallenge
  const full = state.packs >= config.maxPacks
  const canOpen = !!active || ((!complete || (game.debug && !!state.debugCountryId)) && state.packs > 0)

  return (
    <div className="home">
      <header className="home-header">
        <LanguageSelect className="home-lang" />
        <p className="eyebrow">{t('home.eyebrow')}</p>
        <h1 className="wordmark">TerraDeck</h1>
      </header>

      <section className="home-pack" aria-label={t('home.packs')}>
        <button type="button" className="pack-stack" onClick={game.goToExpedition} disabled={!canOpen} aria-label={active ? t('home.resumeExpedition') : t('home.openPack')}>
          {Array.from({ length: Math.max(0, Math.min(state.packs, config.maxPacks) - 1) }, (_, i) => (
            <span key={i} className="pack-ghost" style={{ ['--i' as string]: i + 1 }} />
          ))}
          <PackArt className={state.packs === 0 && !active ? 'is-empty' : ''} />
          <span className="pack-count">
            <strong>{state.packs}</strong>/{config.maxPacks}
          </span>
        </button>

        <div className="home-timer" aria-live="polite">
          {complete ? (
            <span>{t('home.complete')}</span>
          ) : full ? (
            <span>{t('home.stackFull')}</span>
          ) : (
            <span>
              <Trans i18nKey="home.nextPackIn" values={{ time: formatCountdown((state.refillAt ?? now) - now) }} components={{ timer: <strong className="mono" /> }} />
            </span>
          )}
        </div>

        <button type="button" className="btn btn--primary btn--wide" onClick={game.goToExpedition} disabled={!canOpen}>
          {active ? t('home.resume', { country: countryName(active.countryId) }) : state.packs > 0 ? t('home.rip') : t('home.noPacks')}
        </button>
        {game.debug && (
          <div className="debug-pack-controls">
            <form className="debug-pack-form" onSubmit={event => {
              event.preventDefault()
              const code = debugCode.trim().toLowerCase()
              if (code && !COUNTRIES.some(country => country.id === code)) {
                setDebugInvalid(true)
                return
              }
              setDebugInvalid(false)
              void game.addDebugPack(code)
            }}>
              <input aria-label={t('home.debugCountryCode')} aria-invalid={debugInvalid} aria-describedby={debugInvalid ? 'debug-code-error' : undefined}
                placeholder="CH" maxLength={2} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                value={debugCode} onChange={event => { setDebugCode(event.target.value); setDebugInvalid(false) }} />
              <button type="submit" className="btn btn--ghost btn--small">{t('home.debugAddPack')}</button>
            </form>
            {debugInvalid && <p id="debug-code-error" role="alert">{t('home.debugInvalidCode')}</p>}
            {state.debugCountryId && <p role="status">{t('home.debugQueued', { country: countryName(state.debugCountryId) })}</p>}
          </div>
        )}
        {game.debug && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => window.confirm(t('home.confirmReset')) && game.resetProgress()}
          >
            {t('home.debugReset')}
          </button>
        )}
      </section>

      <DailyTourPanel game={game} />

      <button
        type="button"
        className="home-progress panel"
        aria-label={`${t('home.progressTitle')}, ${collected} / ${COUNTRIES.length} cards. ${t('home.collectionTitle')}`}
        onClick={() => game.navigate('collection')}
      >
        <div className="progress-head">
          <h2>{t('home.progressTitle')}</h2>
          <span className="progress-count">
            <Trans i18nKey="home.cardsCount" values={{ collected, total: COUNTRIES.length }} components={{ strong: <strong /> }} />
          </span>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={totalStamps} aria-valuenow={stamps}>
          <span style={{ width: `${(stamps / totalStamps) * 100}%` }} />
        </div>
        <p className="progress-sub">{t('home.stampsEarned', { stamps, total: totalStamps })}</p>
      </button>

      <nav className="home-links" aria-label={t('home.more')}>
        <button type="button" className="link-tile panel" onClick={() => game.navigate('achievements')}>
          <span className="link-title">{t('nav.achievements')}</span>
          <span className="home-achievement-count mono" aria-label={t('achievements.total', { count: achievementsEarned, total: ACHIEVEMENT_IDS.length })}>
            {achievementsEarned} / {ACHIEVEMENT_IDS.length}
          </span>
          <span className="link-sub">{t('home.achievementsSub')}</span>
        </button>
        <button type="button" className="link-tile panel" onClick={() => game.navigate('about')}>
          <span className="link-title">{t('home.aboutTitle')}</span>
          <span className="link-sub">{t('home.aboutSub')}</span>
        </button>
      </nav>
    </div>
  )
}
