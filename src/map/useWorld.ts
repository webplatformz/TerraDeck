import { useEffect, useState } from 'react'
import { loadWorld, type WorldData } from '../data/world'

export function useWorld(): WorldData | null {
  const [world, setWorld] = useState<WorldData | null>(null)
  useEffect(() => {
    let alive = true
    loadWorld().then((w) => alive && setWorld(w))
    return () => {
      alive = false
    }
  }, [])
  return world
}
