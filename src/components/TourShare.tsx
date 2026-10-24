import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function TourShare({ text }: { text: string }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'copied' | 'copyFailed' | 'shareFailed' | null>(null)
  const [busy, setBusy] = useState(false)
  const share = async () => {
    setBusy(true)
    try {
      await navigator.share({ text })
      setStatus(null)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.warn('TerraDeck: could not share tour result', error)
        setStatus('shareFailed')
      }
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        setStatus('copyFailed')
        return
      }
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch (error) {
      console.warn('TerraDeck: could not copy tour result', error)
      setStatus('copyFailed')
    }
  }
  return (
    <section className="tour-share">
      <div className="tour-actions">
        {typeof navigator.share === 'function' && <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void share()}>{t('tour.share')}</button>}
        <button type="button" className="btn btn--ghost" onClick={() => void copy()}>{t('tour.copy')}</button>
      </div>
      {status && <p role="status">{t(`tour.${status}`)}</p>}
      <textarea aria-label={t('tour.copy')} readOnly value={text} rows={5} onFocus={event => event.currentTarget.select()} />
    </section>
  )
}
