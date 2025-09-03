import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { useEffect, useState } from 'react';

// Import translations
import en from '../locales/en.json';
import es from '../locales/es.json';

// Create I18n instance
const i18n = new I18n({
  en,
  es,
});

// Set the locale once at the beginning of your app
const deviceLanguage = getLocales()[0]?.languageCode || 'en';
i18n.locale = deviceLanguage;

// When a value is missing from a language it'll fall back to another language with the key present
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function useI18n() {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    // Update locale when device language changes (if needed)
    const currentDeviceLanguage = getLocales()[0]?.languageCode || 'en';
    if (currentDeviceLanguage !== locale) {
      i18n.locale = currentDeviceLanguage;
      setLocale(currentDeviceLanguage);
    }
  }, [locale]);

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  const changeLocale = (newLocale: string) => {
    i18n.locale = newLocale;
    setLocale(newLocale);
  };

  const getCurrentLocale = () => {
    return locale;
  };

  const isSpanish = () => {
    return locale === 'es';
  };

  const isEnglish = () => {
    return locale === 'en';
  };

  return {
    t,
    locale,
    changeLocale,
    getCurrentLocale,
    isSpanish,
    isEnglish,
  };
}