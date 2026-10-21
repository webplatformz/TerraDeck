export const DEFERRED = {
  tv: 'Missing from the installed world-atlas 50m geometry.',
  va: 'Subpixel polygon at maximum ordinary phone zoom.',
  mc: 'Tiny coastal polygon with unreliable neighboring-country selection.',
  mv: 'Individual islands remain near-invisible at maximum ordinary phone zoom.',
  nr: 'Island remains near-invisible at maximum ordinary phone zoom.',
}

/** A duplicate ISO code does not make a separately mapped entity an answer. */
export const CONTEXT_ONLY_FEATURES = [
  'Somaliland', 'N. Cyprus', 'Siachen Glacier', 'Ashmore and Cartier Is.',
]
