/**
 * Initial game-only exclusions, not a complete sovereignty/recognition policy.
 * Other non-roster countries remain valid wrong answers.
 */
export const EXCLUDED_TERRITORY_ISOS = [
  'AI', 'AS', 'AW', 'AX', 'BL', 'BM', 'BQ', 'BV', 'CC', 'CK', 'CW', 'CX',
  'FK', 'FO', 'GF', 'GG', 'GI', 'GL', 'GP', 'GS', 'GU', 'HK', 'HM', 'IM',
  'IO', 'JE', 'KY', 'MF', 'MO', 'MP', 'MQ', 'MS', 'NC', 'NF', 'NU', 'PF',
  'PM', 'PN', 'PR', 'RE', 'SH', 'SJ', 'SX', 'TC', 'TF', 'TK', 'UM', 'VG',
  'VI', 'WF', 'YT',
]

/** Separately gray overseas polygons that the atlas embeds inside a parent shape. */
export const EXCLUDED_PARTS = [
  { parent: 'France', name: 'French Guiana', box: [-65, 0, -50, 8], continent: 'south-america' },
  { parent: 'France', name: 'French Caribbean islands', box: [-65, 10, -55, 20], continent: 'north-america' },
  { parent: 'France', name: 'French Indian Ocean islands', box: [40, -25, 60, -10], continent: 'africa' },
  { parent: 'Netherlands', name: 'Caribbean Netherlands', box: [-72, 10, -60, 20], continent: 'north-america' },
]
