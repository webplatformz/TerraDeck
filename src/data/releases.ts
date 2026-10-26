interface Release {
  major: number
  date: string
  title: { en: string; de: string }
  notes: {
    en: readonly { label: string; description: string }[]
    de: readonly { label: string; description: string }[]
  }
}

// Keep approved release dates fixed; retain older entries when adding a release.
export const RELEASES = [
  {
    major: 1,
    date: '2026-10-26',
    title: { en: 'Daily tours back on track', de: 'Tagestouren wieder auf Kurs' },
    notes: {
      en: [
        {
          label: 'Tour recovery',
          description: 'Fixed blocked daily tours while preserving collection progress and preventing duplicate rewards.',
        },
      ],
      de: [
        {
          label: 'Tour-Rettung',
          description: 'Blockierte Tagestouren behoben; Sammlungsfortschritt bleibt erhalten und Belohnungen werden nicht doppelt vergeben.',
        },
      ],
    },
  },
  {
    major: 1,
    date: '2026-10-25',
    title: { en: 'TerraDeck goes live', de: 'TerraDeck geht an den Start' },
    notes: {
      en: [
        {
          label: 'Production debut',
          description: 'Our first production release brings together mobile-first map challenges, Visitor and Explorer stamps, and a collection of 168 playable countries. Daily tours and achievements offer more ways to explore. No passport required.',
        },
        {
          label: 'Country content',
          description: 'Expanded and revised card facts and Field notes across the atlas, including new fun facts. Wombat cubes and book-protecting bats made the cut; uncertain facts stayed out.',
        },
        {
          label: 'EN/DE',
          description: 'Updated country texts in both English and German, with matching translations for the new facts and fun facts.',
        },
        {
          label: 'Release history',
          description: 'Added a discreet footer version link and an in-app release archive. Versions use a fixed release date, independent of saved-data versions. No build-date roulette.',
        },
        {
          label: 'Privacy & licences',
          description: 'Expanded privacy information and added downloadable third-party licence notices and country-data sources. The paperwork gets a place in the atlas, too.',
        },
      ],
      de: [
        {
          label: 'Produktionsstart',
          description: 'Unser erster Produktionsrelease vereint mobilfreundliche Kartenaufgaben, Besucher- und Entdecker-Stempel und eine Sammlung mit 168 spielbaren Ländern. Tägliche Touren und Erfolge laden zum Weiterentdecken ein. Reisepass nicht erforderlich.',
        },
        {
          label: 'Länderinhalte',
          description: 'Kartenfakten und Feldnotizen im Atlas erweitert und überarbeitet, inklusive neuer kurioser Fakten. Wombat-Würfel und Bücher beschützende Fledermäuse sind dabei; unsichere Fakten bleiben draußen.',
        },
        {
          label: 'DE/EN',
          description: 'Ländertexte auf Deutsch und Englisch aktualisiert, mit passenden Übersetzungen der neuen Fakten und kuriosen Geschichten.',
        },
        {
          label: 'Release-Verlauf',
          description: 'Dezenten Versionslink in der Fußzeile und einen Release-Verlauf in der App ergänzt. Versionen nutzen ein festes Veröffentlichungsdatum, unabhängig von Spielstand-Versionen. Kein Build-Datum-Roulette.',
        },
        {
          label: 'Datenschutz & Lizenzen',
          description: 'Datenschutzhinweise erweitert sowie Lizenzhinweise Dritter und Länderdaten-Quelldateien zum Herunterladen ergänzt. Auch der Papierkram bekommt seinen Platz im Atlas.',
        },
      ],
    },
  },
] as const satisfies readonly Release[]

export function releaseVersion(release: Pick<Release, 'major' | 'date'>): string {
  return `v${release.major}.${release.date.replace(/-/g, '')}`
}

export const CURRENT_RELEASE = RELEASES[0]
export const APP_VERSION = releaseVersion(CURRENT_RELEASE)
