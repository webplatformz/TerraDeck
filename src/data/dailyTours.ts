import type { ContinentId } from '../domain/types'

export interface TourDefinition {
  id: string
  continent: ContinentId
  countryIds: readonly string[]
  title: { en: string; de: string }
}

/** Published versions and reference points are immutable; add forward-effective schedules. */
const ORIGINAL_TOURS = [
  { id: 'europe-01', continent: 'europe', countryIds: ['no', 'de', 'fr', 'it', 'gr'],
    title: { en: 'Fjords to the Aegean', de: 'Vom Fjord zur Ägäis' } },
  { id: 'africa-01', continent: 'africa', countryIds: ['ma', 'gh', 'ke', 'mg', 'na'],
    title: { en: 'An African zigzag', de: 'Afrika im Zickzack' } },
  { id: 'asia-01', continent: 'asia', countryIds: ['jp', 'vn', 'np', 'in', 'id'],
    title: { en: 'Islands and high peaks', de: 'Inseln und hohe Gipfel' } },
] satisfies TourDefinition[]

export const TOUR_CATALOGUE: readonly TourDefinition[] = [
  ...ORIGINAL_TOURS,
  { id: 'europe-02', continent: 'europe', countryIds: ['is', 'ie', 'gb', 'pt', 'es'], title: { en: 'Atlantic postcards', de: 'Atlantik-Postkarten' } },
  { id: 'africa-02', continent: 'africa', countryIds: ['eg', 'ly', 'tn', 'dz', 'ma'], title: { en: 'Desert doorstep', de: 'Am Wüstenrand' } },
  { id: 'asia-02', continent: 'asia', countryIds: ['jp', 'qa', 'in', 'cn', 'np'], title: { en: 'Five-letter club', de: 'Fünf Buchstaben (Englisch)' } },
  { id: 'north-america-01', continent: 'north-america', countryIds: ['jm', 'us', 'pa', 'tt', 'sv'], title: { en: 'Coast to coast', de: 'Von Küste zu Küste' } },
  { id: 'south-america-01', continent: 'south-america', countryIds: ['br', 'co', 'ar', 'gy', 'bo'], title: { en: 'Continental pinball', de: 'Kontinent-Flipper' } },
  { id: 'oceania-01', continent: 'oceania', countryIds: ['au', 'fj', 'pg', 'nz', 'sb'], title: { en: 'Across the blue', de: 'Quer durchs Blau' } },
  { id: 'europe-03', continent: 'europe', countryIds: ['dk', 'se', 'fi', 'ee', 'lv'], title: { en: 'Baltic breeze', de: 'Ostseebrise' } },
  { id: 'africa-03', continent: 'africa', countryIds: ['sn', 'gm', 'gw', 'gn', 'cv'], title: { en: 'Atlantic sunshine', de: 'Atlantiksonne' } },
  { id: 'asia-03', continent: 'asia', countryIds: ['th', 'la', 'kh', 'mm', 'vn'], title: { en: 'Monsoon miles', de: 'Monsun-Meilen' } },
  { id: 'north-america-02', continent: 'north-america', countryIds: ['bz', 'do', 'ca', 'mx', 'cu'], title: { en: 'Palms to pines', de: 'Palmen und Kiefern' } },
  { id: 'south-america-02', continent: 'south-america', countryIds: ['br', 'ar', 'pe', 'co', 'bo'], title: { en: 'Room to roam', de: 'Platz zum Streifen' } },
  { id: 'oceania-02', continent: 'oceania', countryIds: ['ws', 'vu', 'fj', 'sb', 'nz'], title: { en: 'Little ocean atlas', de: 'Kleiner Ozean-Atlas' } },
  { id: 'europe-04', continent: 'europe', countryIds: ['lu', 'me', 'si', 'mk', 'al'], title: { en: 'Small wonders', de: 'Kleine Wunder' } },
  { id: 'africa-04', continent: 'africa', countryIds: ['gh', 'ly', 'ke', 'bj', 'ga'], title: { en: 'Short and sweet', de: 'Kurz und bündig' } },
  { id: 'asia-04', continent: 'asia', countryIds: ['lk', 'mn', 'cy', 'ph', 'af'], title: { en: 'Far-flung five', de: 'Fünf in der Ferne' } },
  { id: 'north-america-03', continent: 'north-america', countryIds: ['tt', 'jm', 'bs', 'sv', 'bz'], title: { en: 'Pocket postcards', de: 'Taschenpostkarten' } },
  { id: 'south-america-03', continent: 'south-america', countryIds: ['ec', 'py', 've', 'cl', 'br'], title: { en: 'Equator echoes', de: 'Äquator-Echos' } },
  { id: 'europe-05', continent: 'europe', countryIds: ['ua', 'fr', 'es', 'se', 'no'], title: { en: 'Big picture', de: 'Das große Ganze' } },
  { id: 'africa-05', continent: 'africa', countryIds: ['sn', 'so', 'za', 'sl', 'sd'], title: { en: 'S marks the spot', de: 'S markiert das Ziel' } },
  { id: 'asia-05', continent: 'asia', countryIds: ['pk', 'kz', 'af', 'uz', 'tj'], title: { en: 'The Stan club', de: 'Der Stan-Club' } },
  { id: 'europe-06', continent: 'europe', countryIds: ['hr', 'ba', 'me', 'al', 'mk'], title: { en: 'Balkan backroads', de: 'Balkan-Nebenwege' } },
  { id: 'africa-06', continent: 'africa', countryIds: ['bj', 'ng', 'cm', 'gq', 'ga'], title: { en: 'Gulf greetings', de: 'Grüße vom Golf' } },
  { id: 'asia-06', continent: 'asia', countryIds: ['kz', 'uz', 'tm', 'kg', 'tj'], title: { en: 'Silk road turns', de: 'Seidenstraßen-Kurven' } },
  { id: 'europe-07', continent: 'europe', countryIds: ['es', 'se', 'ch', 'rs', 'sk'], title: { en: 'Simply S', de: 'Einfach S' } },
  { id: 'africa-07', continent: 'africa', countryIds: ['dz', 'cd', 'sd', 'ly', 'td'], title: { en: 'Wide-angle Africa', de: 'Afrika im Weitwinkel' } },
  { id: 'asia-07', continent: 'asia', countryIds: ['ru', 'cn', 'in', 'kz', 'sa'], title: { en: 'Atlas heavyweights', de: 'Atlas-Schwergewichte' } },
  { id: 'africa-08', continent: 'africa', countryIds: ['et', 'er', 'dj', 'so', 'sd'], title: { en: 'Horn and horizons', de: 'Horn und Horizonte' } },
  { id: 'asia-08', continent: 'asia', countryIds: ['lb', 'sy', 'il', 'ps', 'jo'], title: { en: 'Eastern shores', de: 'Östliche Ufer' } },
  { id: 'africa-09', continent: 'africa', countryIds: ['cv', 'gm', 'sz', 'dj', 'rw'], title: { en: 'Small but mighty', de: 'Klein, aber oho' } },
  { id: 'asia-09', continent: 'asia', countryIds: ['sa', 'ye', 'om', 'ae', 'qa'], title: { en: 'Arabian arc', de: 'Arabischer Bogen' } },
  { id: 'asia-10', continent: 'asia', countryIds: ['jp', 'pk', 'my', 'ge', 'cn'], title: { en: 'Long-distance letters', de: 'Fernpost' } },
  { id: 'africa-11', continent: 'africa', countryIds: ['za', 'ls', 'sz', 'bw', 'na'], title: { en: 'Southern compass', de: 'Südlicher Kompass' } },
  { id: 'asia-11', continent: 'asia', countryIds: ['kr', 'iq', 'ru', 'id', 'np'], title: { en: 'Wide open atlas', de: 'Atlas ohne Ende' } },
]

export const DAILY_SCHEDULES = [{
  version: 1 as const,
  effectiveAt: Date.UTC(2026, 9, 23),
  tours: ORIGINAL_TOURS,
}, {
  version: 2 as const,
  effectiveAt: Date.UTC(2026, 9, 25),
  tours: TOUR_CATALOGUE,
}] as const
