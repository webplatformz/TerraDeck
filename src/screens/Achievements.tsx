import { useTranslation } from 'react-i18next'
import { COUNTRIES } from '../data/countries'
import {
  ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_IDS, achievementCategory, achievementProgress,
  isHiddenAchievement, type AchievementId,
} from '../domain/achievements'
import type { GameState } from '../domain/types'
import type { Game } from '../game/useGame'

const EMBLEMS = ['✦', '▤', '⌖', '✧']

export function AchievementBadge({ id, state }: { id: AchievementId; state: GameState }) {
  const { t, i18n } = useTranslation()
  const earned = state.achievements?.earned[id]
  const hidden = isHiddenAchievement(id) && !earned
  const measured = achievementProgress(id, state, COUNTRIES)
  const progress = earned ? { current: earned.target, target: earned.target } : measured
  const category = achievementCategory(id)
  const name = hidden ? t('achievements.hidden') : t(`achievements.badges.${id}.name`)
  return (
    <article className={`achievement-badge${earned ? ' is-earned' : ''}${hidden ? ' is-hidden' : ''}`}>
      <div className="achievement-emblem" aria-hidden="true">
        {hidden ? '?' : EMBLEMS[ACHIEVEMENT_CATEGORIES.indexOf(category)]}
        {earned && <span className="achievement-check">✓</span>}
      </div>
      <div className="achievement-copy">
        <span className="achievement-status">{t(earned ? 'achievements.earned' : 'achievements.locked')}</span>
        <h3>{name}</h3>
        <p>{isHiddenAchievement(id) && !earned ? t(`achievements.badges.${id}.hint`) : t(`achievements.badges.${id}.description`)}</p>
        {!hidden && (
          <div className="achievement-progress">
            <progress aria-label={name} value={progress.current} max={progress.target} />
            <span className="mono">{t('achievements.counter', progress)}</span>
          </div>
        )}
        {earned && <time dateTime={new Date(earned.at).toISOString()}>
          {t('achievements.earnedOn', { date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(earned.at) })}
        </time>}
      </div>
    </article>
  )
}

export function Achievements({ game }: { game: Game }) {
  const { t } = useTranslation()
  const count = ACHIEVEMENT_IDS.filter(id => game.state.achievements?.earned[id]).length
  return (
    <div className="achievements">
      <header className="achievements-header">
        <span className="eyebrow">{t('achievements.eyebrow')}</span>
        <h1>{t('nav.achievements')}</h1>
        <p>{t('achievements.intro')}</p>
        <p className="achievement-total">{t('achievements.total', { count, total: ACHIEVEMENT_IDS.length })}</p>
        <p className="achievement-tracking-note">{t('achievements.freshStart')}</p>
      </header>
      {ACHIEVEMENT_CATEGORIES.map(category => (
        <section className={`achievement-category achievement-category--${category}`} key={category} aria-labelledby={`badges-${category}`}>
          <h2 id={`badges-${category}`}>{t(`achievements.categories.${category}`)}</h2>
          <div className="achievement-grid">
            {ACHIEVEMENT_IDS.filter(id => achievementCategory(id) === category).map(id => (
              <AchievementBadge key={id} id={id} state={game.state} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
