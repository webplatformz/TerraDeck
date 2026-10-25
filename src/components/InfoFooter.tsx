import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { mainHash, type HelpSection } from '../game/navigation'
import { APP_VERSION } from '../data/releases'

export function HelpLink({ section, children }: { section: HelpSection; children: ReactNode }) {
  return <a href={mainHash('about', section)} onClick={() => {
    const entry = document.getElementById(`help-${section}`)
    if (!(entry instanceof HTMLDetailsElement)) return
    entry.open = true
    entry.querySelector('summary')?.focus({ preventScroll: true })
    entry.scrollIntoView({ block: 'start' })
  }}>{children}</a>
}

export function InfoFooter() {
  const { t } = useTranslation()
  return (
    <footer className="info-footer">
      <nav aria-label={t('help.footerLabel')}>
        <HelpLink section="impressum">{t('help.impressum.title')}</HelpLink>
        <HelpLink section="privacy">{t('help.privacy.title')}</HelpLink>
        <HelpLink section="sources">{t('help.sources.title')}</HelpLink>
        <HelpLink section="project">{t('help.project.title')}</HelpLink>
      </nav>
      <div className="info-footer-version">
        <a href={mainHash('releases')}>{APP_VERSION} · {t('releases.link')}</a>
      </div>
    </footer>
  )
}
