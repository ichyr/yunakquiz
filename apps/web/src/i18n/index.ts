import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en.ts';
import { uk } from './locales/uk.ts';

export const interfaceLanguages = ['uk', 'en'] as const;

export const resources = {
  uk: { translation: uk },
  en: { translation: en },
} as const;

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

// Ukrainian unless the scout picked another Interface Language before.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uk',
    supportedLngs: interfaceLanguages,
    detection: { order: ['localStorage'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  });

export default i18n;
