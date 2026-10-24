import { useTranslation } from 'react-i18next'
import { Compass } from './Compass'

export function AtlasBack({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="atlas-back" onClick={onClick} aria-label={t('common.backToAtlas')} title={t('common.backToAtlas')}>
      <span aria-hidden="true">←</span>
      <Compass />
    </button>
  )
}
