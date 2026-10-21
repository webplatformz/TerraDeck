export function Compass({ className = '' }: { className?: string }) {
  return (
    <svg className={`compass ${className}`} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="1.5 2.5" opacity=".6" />
      <path d="M50 6 56 44 50 50 44 44Z M50 94 44 56 50 50 56 56Z" fill="currentColor" />
      <path d="M6 50 44 44 50 50 44 56Z M94 50 56 56 50 50 56 44Z" fill="currentColor" opacity=".7" />
      <path d="M22 22 47 47 M78 78 53 53 M78 22 53 47 M22 78 47 53" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
      <circle cx="50" cy="50" r="3.5" fill="var(--ocean-900)" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
