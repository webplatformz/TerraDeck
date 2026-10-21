import { readFileSync, writeFileSync } from 'node:fs'
import { generateRarity } from './rarity/scoring.mjs'

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const result = generateRarity(read('./rarity/snapshot.json'), read('./rarity/roster.json'))
writeFileSync(new URL('../src/data/generated/rarity.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`)
console.log(Object.entries(result).map(([id, r]) => `${id}: ${r.grade}`).join(', '))
