import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Screens animate in with a transform, which would make position: fixed
// overlays relative to the screen instead of the viewport.
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
