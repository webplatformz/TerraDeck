const urls = import.meta.glob('/node_modules/flag-icons/flags/4x3/{fr,it,no,ch,jp,in,vn,np,eg,ke,ma,mg,ca,mx,cu,br,pe,cl,au,nz}.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export function flagUrl(countryId: string): string | undefined {
  return urls[`/node_modules/flag-icons/flags/4x3/${countryId}.svg`]
}
