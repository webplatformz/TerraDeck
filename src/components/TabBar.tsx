import { useTranslation } from 'react-i18next'
import type { MainScreen } from '../game/useGame'
import { Compass } from './Compass'

const TABS: { id: MainScreen; icon: string }[] = [
  { id: 'home', icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15' },
  { id: 'collection', icon: 'M4 5h7v14H4zM13 5h7v14h-7z' },
  { id: 'achievements', icon: 'M12 3l8 5v8l-8 5-8-5V8zM8 12l3 3 5-6' },
  { id: 'about', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17v-5M12 8h.01' },
]

export function TabBar({ active, onNavigate }: { active: MainScreen; onNavigate: (s: MainScreen) => void }) {
  const { t } = useTranslation()
  return (
    <nav className="tabbar" aria-label={t('nav.main')}>
      <button type="button" className="tabbar-brand" aria-label={t('nav.brandHome')} onClick={() => onNavigate('home')}>
        <Compass className="tabbar-brand-icon" />
        <span>TerraDeck</span>
      </button>
      {TABS.map((tab) => (
        <button key={tab.id} type="button" className={`tab${tab.id === active ? ' is-active' : ''}`} aria-current={tab.id === active ? 'page' : undefined} onClick={() => onNavigate(tab.id)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d={tab.icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <span>{t(`nav.${tab.id}`)}</span>
        </button>
      ))}
    </nav>
  )
}
