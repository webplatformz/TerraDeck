import { flagUrl } from '../data/flags'

export function Flag({ countryId, className = '' }: { countryId: string; className?: string }) {
  const src = flagUrl(countryId)
  if (!src) return null
  return <img className={`flag ${className}`} src={src} alt="" draggable={false} />
}
