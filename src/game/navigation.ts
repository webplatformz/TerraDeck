export const HELP_SECTIONS = ['play', 'packs', 'map', 'saving', 'rarity', 'roster', 'territories', 'continents', 'accuracy', 'project', 'report', 'privacy', 'sources', 'impressum'] as const
export type HelpSection = (typeof HELP_SECTIONS)[number]
export type MainScreen = 'home' | 'collection' | 'achievements' | 'about'
export type Screen = MainScreen | 'expedition' | 'daily'
export interface Route {
  screen: Screen
  helpSection: HelpSection | null
}

export function routeFromHash(hash: string): Route {
  const [screen, section] = hash.replace(/^#/, '').split('/')
  if (screen === 'daily') return { screen, helpSection: null }
  if (screen === 'about') {
    const canonical = section === 'stamps' ? 'play' : section === 'deferred' ? 'roster' : section
    return { screen, helpSection: HELP_SECTIONS.find(id => id === canonical) ?? null }
  }
  return { screen: screen === 'collection' || screen === 'achievements' ? screen : 'home', helpSection: null }
}

export function mainHash(screen: MainScreen, section?: HelpSection): string {
  return screen === 'about' && section ? `#about/${section}` : `#${screen}`
}
