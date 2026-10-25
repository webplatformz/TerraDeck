import stories from '../../scripts/content/country-stories.json'

interface Story {
  en: string
  de: string
}

interface CountryStories {
  front?: Story
  detail?: Story
  fun?: Story
}

export const COUNTRY_STORIES: Partial<Record<string, CountryStories>> =
  Object.fromEntries(stories.map(({ id, ...facts }) => [id, facts]))
