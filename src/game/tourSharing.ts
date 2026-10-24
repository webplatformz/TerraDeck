export const TOUR_PUBLIC_URL = 'https://webplatformz.github.io/TerraDeck/#daily'

export function tourShareText(number: number, title: string, correct: readonly boolean[], distances: readonly number[], language: string): string {
  const de = language.startsWith('de')
  return [
    `TerraDeck · World Tour #${number}`,
    title,
    correct.map(value => value ? '🟩' : '🟥').join(''),
    `${correct.filter(Boolean).length}/5 ${de ? 'richtig' : 'correct'}`,
    `${de ? 'Abweichung' : 'Off target'}: ${distances.reduce((sum, km) => sum + km, 0)} km`,
    TOUR_PUBLIC_URL,
  ].join('\n')
}
