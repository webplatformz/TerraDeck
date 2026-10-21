import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { displayedStamps, MASTERY_STAGES, MASTERY_STAMP_COUNT } from '../domain/mastery'
import { STAMP_INKS, STAMP_PAPERS, STAMP_ROTATIONS } from '../theme'

interface StampProps {
  stage: (typeof MASTERY_STAGES)[number]
  filled: boolean
  code: string
  size?: number
  animate?: boolean
}

export function Stamp({ stage, filled, code, size = 44, animate = false }: StampProps) {
  const id = useId().replace(/:/g, '')
  const { t } = useTranslation()
  const index = stage.id === 'visitor' ? 0 : 1
  const ink = STAMP_INKS[index]
  const rotation = STAMP_ROTATIONS[index]

  if (!filled) {
    return (
      <svg className="stamp stamp--empty" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="28" />
        <text x="32" y="38">{stage.numeral}</text>
      </svg>
    )
  }

  return (
    <svg
      className={`stamp${animate ? ' stamp--slam' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ color: ink, ['--stamp-paper' as string]: STAMP_PAPERS[index], ['--stamp-rot' as string]: `${rotation}deg` }}
      aria-hidden
    >
      <defs>
        <filter id={`rough-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={index + 3} />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 1 1 1 0.85 1" />
          </feComponentTransfer>
        </filter>
        <path id={`ring-${id}`} d="M32 32m-21 0a21 21 0 1 1 42 0a21 21 0 1 1 -42 0" />
      </defs>
      <circle cx="32" cy="32" r="31" fill="var(--stamp-paper, transparent)" />
      <g filter={`url(#rough-${id})`} transform={`rotate(${rotation} 32 32)`}>
        <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
        <text className="stamp-ring-text" fill="currentColor">
          <textPath href={`#ring-${id}`} startOffset="0">
            {t('stamp.ring', { numeral: stage.numeral })}
          </textPath>
        </text>
        <text x="32" y="37" className="stamp-code" fill="currentColor">
          {code.toUpperCase()}
        </text>
        <text x="32" y="47" className="stamp-numeral" fill="currentColor">{stage.numeral}</text>
      </g>
    </svg>
  )
}

interface StampRowProps {
  stamps: number
  code: string
  size?: number
  /** Index of a stamp that has just been earned and should animate in. */
  fresh?: number | null
}

export function StampRow({ stamps, code, size, fresh = null }: StampRowProps) {
  const { t } = useTranslation()
  return (
    <div className="stamp-row" role="group" aria-label={t('stamp.rowLabel', { stamps: displayedStamps(stamps), total: MASTERY_STAMP_COUNT })}>
      {MASTERY_STAGES.map((stage, i) => (
        <span className={`stamp-stage${i < stamps ? ' is-earned' : ''}`} role="img" key={stage.id}
          aria-label={t('stamp.stageLabel', { stage: t(`stamp.${stage.id}`), status: t(i < stamps ? 'stamp.earned' : 'stamp.notEarned') })}>
          <Stamp stage={stage} filled={i < stamps} code={code} size={size} animate={i === fresh} />
          <span className="stamp-stage-name" aria-hidden="true">{t(`stamp.${stage.id}`)}</span>
        </span>
      ))}
    </div>
  )
}
