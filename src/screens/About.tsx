import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Game } from '../game/useGame'
import type { HelpSection } from '../game/navigation'
import { COUNTRIES } from '../data/countries'
import { PROJECT, SOURCE_LINKS } from '../data/project'
import { LanguageSelect } from '../components/LanguageSelect'
import { HelpLink } from '../components/InfoFooter'

function Entry({ id, title, children }: { id: HelpSection; title: string; children: ReactNode }) {
  return (
    <details id={`help-${id}`} className="help-entry panel" open={id === 'play'}>
      <summary><h3>{title}</h3><span aria-hidden="true">+</span></summary>
      <div className="help-answer">{children}</div>
    </details>
  )
}

export function About({ game }: { game: Game }) {
  const { t } = useTranslation()
  const page = useRef<HTMLDivElement>(null)
  const { cooldownMs, maxPacks } = game.config
  const cooldown = cooldownMs < 60000 ? t('about.seconds', { count: cooldownMs / 1000 }) : t('about.minutes', { count: Math.round(cooldownMs / 60000) })

  useEffect(() => {
    if (!game.helpSection) return
    const entry = page.current?.querySelector<HTMLDetailsElement>(`#help-${game.helpSection}`)
    if (!entry) return
    entry.open = true
    const frame = requestAnimationFrame(() => {
      entry.querySelector('summary')?.focus({ preventScroll: true })
      entry.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [game.helpSection])

  const textEntry = (id: HelpSection, title: string, body: string) => <Entry key={id} id={id} title={title}><p>{body}</p></Entry>

  return (
    <div className="about help-page" ref={page}>
      <header className="page-header">
        <LanguageSelect />
        <p className="eyebrow">{t('about.eyebrow')}</p>
        <h1>{t('help.title')}</h1>
        <p>{t('help.intro')}</p>
      </header>
      {game.state.activeChallenge && <button type="button" className="btn btn--ghost" onClick={game.goToExpedition}>{t('home.resumeExpedition')}</button>}
      <section className="help-group" aria-labelledby="help-playing">
        <h2 id="help-playing">{t('help.playing')}</h2>
        {textEntry('play', t('help.play.title'), t('help.play.body'))}
        {textEntry('packs', t('help.packs.title'), t('help.packs.body', { cooldown, max: maxPacks }))}
        {textEntry('map', t('help.map.title'), t('help.map.body'))}
        <Entry id="saving" title={t('help.saving.title')}>
          <p>{t('help.saving.body')}</p>
          <HelpLink section="privacy">{t('help.privacy.title')}</HelpLink>
        </Entry>
        {textEntry('rarity', t('help.rarity.title'), t('help.rarity.body'))}
      </section>
      <section className="help-group" aria-labelledby="help-places">
        <h2 id="help-places">{t('help.places')}</h2>
        <Entry id="roster" title={t('help.roster.title')}>
          <p>{t('help.roster.body', { count: COUNTRIES.length })}</p>
          <p>{t('help.roster.excluded')}</p>
          <p className="help-aside">{t('help.roster.wink')}</p>
        </Entry>
        {textEntry('territories', t('help.territories.title'), t('help.territories.body'))}
        {textEntry('continents', t('help.continents.title'), t('about.continentRule'))}
        {textEntry('accuracy', t('help.accuracy.title'), t('help.accuracy.body'))}
      </section>
      <section className="help-group" aria-labelledby="help-information">
        <h2 id="help-information">{t('help.information')}</h2>
        <Entry id="project" title={t('help.project.title')}>
          <p>{t('notice.project')}</p>
          <p>{t('help.project.inspiration')}</p>
          <a href={PROJECT.inspirationUrl}>{t('help.project.credit')}</a>
        </Entry>
        <Entry id="report" title={t('help.report.title')}>
          <p>{t('help.report.body')}</p>
          <a href={PROJECT.issuesUrl}>{t('help.report.link')}</a>
          <p className="help-aside">{t('help.report.public')}</p>
        </Entry>
        <Entry id="privacy" title={t('help.privacy.title')}>
          <p>{t('help.privacy.local')}</p>
          <p>{t('help.privacy.hosting')}</p>
          <a href={PROJECT.hostingPrivacyUrl}>{t('help.privacy.hostLink')}</a>
          <p>{t('help.privacy.external')}</p>
          <p>{t('help.privacy.clear')}</p>
        </Entry>
        <Entry id="sources" title={t('help.sources.title')}>
          <p>{t('help.sources.body')}</p>
          <ul>{SOURCE_LINKS.map(source => <li key={source.id}><a href={source.url}>{t(`help.sources.${source.id}`)}</a></li>)}</ul>
        </Entry>
        <Entry id="impressum" title={t('help.impressum.title')}>
          <p>{t('help.impressum.by', { name: PROJECT.creator })}</p>
          <HelpLink section="report">{t('help.report.link')}</HelpLink>
          <p className="help-draft">{t('help.impressum.incomplete')}</p>
        </Entry>
      </section>
    </div>
  )
}
