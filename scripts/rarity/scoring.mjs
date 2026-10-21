export const GRADES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
export const OVERRIDES = { ch: { grade: 'legendary', reason: "The creator's playful Switzerland override." } }

/** Midrank percentile gives tied source values the same score. */
export function percentile(values, value) {
  return (values.filter((v) => v < value).length + (values.filter((v) => v === value).length - 1) / 2) / (values.length - 1)
}

export function generateRarity(snapshot, roster) {
  if (!snapshot.countrySource || !snapshot.articleSource || !snapshot.editionSource || !snapshot.retrievedAt) throw new Error('Missing rarity provenance')
  const sites = new Set(snapshot.wikipediaSites)
  if (sites.size < 250) throw new Error('Missing Wikipedia site reference')
  const reference = snapshot.countries
  if (reference.length !== 193 || new Set(reference.map((c) => c.id)).size !== 193) throw new Error('Invalid reference baseline')
  for (const c of reference) {
    if (!Number.isFinite(c.areaKm2) || c.areaKm2 <= 0 || !Number.isInteger(c.coverage) || c.coverage <= 0 ||
        !c.wikidata || !c.article || c.editions?.length !== c.coverage || new Set(c.editions).size !== c.coverage ||
        c.editions.some((site) => !sites.has(site))) {
      throw new Error(`Invalid source data: ${c.id}`)
    }
  }
  if (roster.length !== 40 || new Set(roster).size !== roster.length) throw new Error('Expected 40 unique playable countries')
  const coverages = reference.map((c) => c.coverage)
  const areas = reference.map((c) => c.areaKm2)
  const result = Object.fromEntries(roster.map((id) => {
    const c = reference.find((entry) => entry.id === id)
    if (!c) throw new Error(`Missing rarity source: ${id}`)
    const familiarity = 1 - percentile(coverages, c.coverage)
    const smallness = 1 - percentile(areas, c.areaKm2)
    const score = 0.8 * familiarity + 0.2 * smallness
    const calculated = GRADES[Math.min(4, Math.floor(score * 5))]
    const override = OVERRIDES[id]
    return [id, {
      grade: override?.grade ?? calculated,
      score: Number(score.toFixed(6)),
      familiarity: Number(familiarity.toFixed(6)),
      smallness: Number(smallness.toFixed(6)),
      ...(override ? { override: override.reason } : {}),
    }]
  }))
  for (const grade of GRADES) if (!Object.values(result).some((r) => r.grade === grade)) throw new Error(`Test roster lacks grade: ${grade}`)
  return result
}
