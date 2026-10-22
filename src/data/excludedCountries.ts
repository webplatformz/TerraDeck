import type { Language } from '../i18n'

function excludedCountry(id: string, en: string, de = en) {
  const article = (language: Language, name: string) => ({
    name,
    wikipediaUrl: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`,
  })
  return { id, en: article('en', en), de: article('de', de) }
}

// Article titles and canonical URLs verified with Wikipedia's query API on 2026-10-22.
export const EXCLUDED_COUNTRIES = [
  excludedCountry('sm', 'San Marino'),
  excludedCountry('li', 'Liechtenstein'),
  excludedCountry('mt', 'Malta'),
  excludedCountry('ad', 'Andorra'),
  excludedCountry('sg', 'Singapore', 'Singapur'),
  excludedCountry('bh', 'Bahrain'),
  excludedCountry('kn', 'Saint Kitts and Nevis', 'St. Kitts und Nevis'),
  excludedCountry('gd', 'Grenada'),
  excludedCountry('vc', 'Saint Vincent and the Grenadines', 'St. Vincent und die Grenadinen'),
  excludedCountry('bb', 'Barbados'),
  excludedCountry('ag', 'Antigua and Barbuda', 'Antigua und Barbuda'),
  excludedCountry('lc', 'Saint Lucia', 'St. Lucia'),
  excludedCountry('dm', 'Dominica'),
  excludedCountry('sc', 'Seychelles', 'Seychellen'),
  excludedCountry('st', 'São Tomé and Príncipe', 'São Tomé und Príncipe'),
  excludedCountry('km', 'Comoros', 'Komoren'),
  excludedCountry('mu', 'Mauritius'),
  excludedCountry('mh', 'Marshall Islands', 'Marshallinseln'),
  excludedCountry('pw', 'Palau'),
  excludedCountry('fm', 'Federated States of Micronesia', 'Föderierte Staaten von Mikronesien'),
  excludedCountry('to', 'Tonga'),
  excludedCountry('ki', 'Kiribati'),
  excludedCountry('tv', 'Tuvalu'),
  excludedCountry('va', 'Vatican City', 'Vatikanstadt'),
  excludedCountry('mc', 'Monaco'),
  excludedCountry('mv', 'Maldives', 'Malediven'),
  excludedCountry('nr', 'Nauru'),
] as const
