import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENT_IDS, type AchievementId } from '../domain/achievements'
import type { Game } from '../game/useGame'
import { AchievementBadge } from '../screens/Achievements'
import { Portal } from './Portal'

/** The lock is held while the summary is visible, not just while choosing its owner. */
export function AchievementNotification({ game, enabled }: { game: Game; enabled: boolean }) {
  const { t } = useTranslation()
  const [owner, setOwner] = useState('')
  const [details, setDetails] = useState<AchievementId[]>([])
  const [foreground, setForeground] = useState(() => document.visibilityState === 'visible' && document.hasFocus())
  const dialog = useRef<HTMLDialogElement>(null)
  const pending = ACHIEVEMENT_IDS.filter(id => {
    const award = game.state.achievements?.earned[id]
    return award && !award.acknowledged
  })
  const pendingKey = pending.join(',')
  const first = pending[0]
  const eligible = enabled && foreground && !game.state.activeChallenge && game.screen !== 'expedition' && pending.length > 0

  useEffect(() => {
    const update = () => setForeground(document.visibilityState === 'visible' && document.hasFocus())
    const blur = () => setForeground(false)
    window.addEventListener('focus', update)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  useEffect(() => {
    if (!eligible) return
    let disposed = false
    let release: (() => void) | undefined
    const controller = new AbortController()
    if (navigator.locks) {
      void navigator.locks.request(game.notificationLock, { signal: controller.signal }, async () => {
        if (disposed) return
        setOwner(pendingKey)
        await new Promise<void>(resolve => { release = resolve })
        setOwner('')
      }).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('TerraDeck: badge notification coordination failed', error)
      })
    } else {
      const focus = () => setOwner(document.hasFocus() ? pendingKey : '')
      focus()
      window.addEventListener('focus', focus)
      window.addEventListener('blur', focus)
      release = () => {
        window.removeEventListener('focus', focus)
        window.removeEventListener('blur', focus)
        setOwner('')
      }
    }
    return () => {
      disposed = true
      controller.abort()
      release?.()
    }
  }, [eligible, pendingKey, game.notificationLock])

  useEffect(() => {
    if (!details.length || !dialog.current) return
    const element = dialog.current
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!element.open) element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [details])

  const openDetails = () => {
    const batch = pending
    void game.acknowledgeBadges(batch).then(saved => { if (saved) setDetails(batch) })
  }
  return (
    <>
      {eligible && owner === pendingKey && (
        <aside className="achievement-notification" aria-label={t('achievements.notificationLabel')}>
          <div role="status">
            <strong>{t(pending.length === 1 ? 'achievements.notificationOne' : 'achievements.notificationMany', { count: pending.length })}</strong>
            <p>{pending.length === 1 && first ? t(`achievements.badges.${first}.name`) : t('achievements.notificationSummary')}</p>
          </div>
          <div className="achievement-notification-actions">
            <button type="button" className="btn btn--primary" onClick={openDetails}>{t('achievements.view')}</button>
            <button type="button" className="btn btn--ghost" onClick={() => void game.acknowledgeBadges(pending)}>{t('common.close')}</button>
          </div>
        </aside>
      )}
      {details.length > 0 && (
        <Portal>
          <dialog ref={dialog} className="achievement-dialog" aria-labelledby="achievement-dialog-title" onClose={() => setDetails([])}>
            <header>
              <h2 id="achievement-dialog-title">{t('achievements.notificationLabel')}</h2>
              <button type="button" className="btn btn--ghost" autoFocus onClick={() => dialog.current?.close()}>{t('common.close')}</button>
            </header>
            {details.map(id => <AchievementBadge key={id} id={id} state={game.state} />)}
          </dialog>
        </Portal>
      )}
    </>
  )
}
