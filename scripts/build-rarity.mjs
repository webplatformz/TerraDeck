import { readFileSync, writeFileSync } from 'node:fs'
import { generateRarity } from './rarity/scoring.mjs'

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const extra = read('./atlas/snapshot.json')
if (!extra.articleSource || !extra.countrySource || !extra.retrievedAt) throw new Error('Missing observer rarity provenance')
const result = generateRarity(read('./rarity/snapshot.json'), read('./rarity/roster.json'), extra.observerRarity)
const before = read('../src/data/generated/rarity.json')
for (const id of read('./atlas/initial-roster.json')) {
  if (before[id]?.grade !== result[id]?.grade) throw new Error(`Original rarity changed: ${id}`)
}
writeFileSync(new URL('../src/data/generated/rarity.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`)
console.log(Object.entries(result).map(([id, r]) => `${id}: ${r.grade}`).join(', '))
