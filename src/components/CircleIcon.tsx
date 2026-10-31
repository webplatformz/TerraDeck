export function CircleIcon({ icon }: { icon: 'arrow' | 'close' }) {
  return (
    <span className="action-circle" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon === 'arrow' ? 'M5 12h14m-6-6 6 6-6 6' : 'm7 7 10 10M17 7 7 17'} />
      </svg>
    </span>
  )
}
