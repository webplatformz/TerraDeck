import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpLink } from './InfoFooter'
import { LanguageSelect } from './LanguageSelect'
import { Portal } from './Portal'

export function ProjectNotice({ onAcknowledge, onDismiss }: { onAcknowledge: () => void; onDismiss: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    title.current?.focus()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])

  return (
    <Portal>
      <dialog ref={dialog} className="project-notice" aria-labelledby="notice-title" aria-describedby="notice-copy" onKeyDown={event => {
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), select:not(:disabled)')]
        const index = controls.findIndex(control => control === document.activeElement)
        if (index === -1 || (event.shiftKey ? index === 0 : index === controls.length - 1)) {
          event.preventDefault()
          controls[event.shiftKey ? controls.length - 1 : 0]?.focus()
        }
      }} onCancel={event => {
        event.preventDefault()
        onDismiss()
      }}>
        <div className="notice-heading">
          <p className="eyebrow">{t('notice.eyebrow')}</p>
          <LanguageSelect />
        </div>
        <h1 id="notice-title" tabIndex={-1} ref={title}>{t('notice.title')}</h1>
        <div id="notice-copy" className="notice-copy">
          <p>{t('notice.project')}</p>
          <p>{t('notice.limitations')}</p>
        </div>
        <button type="button" className="btn btn--primary btn--wide" onClick={onAcknowledge}>{t('notice.acknowledge')}</button>
        <nav className="notice-links" aria-label={t('help.footerLabel')}>
          <HelpLink section="project">{t('notice.more')}</HelpLink>
          <HelpLink section="privacy">{t('help.privacy.title')}</HelpLink>
          <HelpLink section="impressum">{t('help.impressum.title')}</HelpLink>
        </nav>
      </dialog>
    </Portal>
  )
}
