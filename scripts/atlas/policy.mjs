export const ORIGINAL_DEFERRED = {
  tv: 'Missing from the installed world-atlas 50m geometry.',
  va: 'Subpixel polygon at maximum ordinary phone zoom.',
  mc: 'Tiny coastal polygon with unreliable neighboring-country selection.',
  mv: 'Individual islands remain near-invisible at maximum ordinary phone zoom.',
  nr: 'Island remains near-invisible at maximum ordinary phone zoom.',
}

export const MOBILE_DEFERRED = [
  'sm', 'li', 'mt', 'ad', 'sg', 'bh', 'kn', 'gd', 'vc', 'bb', 'ag',
  'lc', 'dm', 'sc', 'st', 'km', 'mu', 'mh', 'pw', 'fm', 'to', 'ki',
]

export const DEFERRED = {
  ...ORIGINAL_DEFERRED,
  ...Object.fromEntries(MOBILE_DEFERRED.map(id => [id, 'Unreliable natural touch target on small screens.'])),
}

/** A duplicate ISO code does not make a separately mapped entity an answer. */
export const CONTEXT_ONLY_FEATURES = [
  'Somaliland', 'N. Cyprus', 'Siachen Glacier', 'Ashmore and Cartier Is.',
]
