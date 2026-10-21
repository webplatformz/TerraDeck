import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { languageStore } from '../persistence/languageStore'
import de from './locales/de.json'
import en from './locales/en.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']
export const DEFAULT_LANGUAGE: Language = 'en'

// Compile-time check: every locale must provide every key of the English source.
const german: typeof en = de

export const resources = {
  en: { translation: en },
  de: { translation: german },
} as const

const isLanguage = (value: string | null): value is Language => LANGUAGES.some((l) => l.code === value)

const stored = languageStore.load()
const initial: Language = isLanguage(stored) ? stored : DEFAULT_LANGUAGE

const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false },
})
syncDocumentLanguage(initial)
i18n.on('languageChanged', syncDocumentLanguage)

/** Switches the UI language and remembers the explicit choice on this device. */
export function setLanguage(language: Language) {
  languageStore.save(language)
  void i18n.changeLanguage(language)
}

export default i18n
