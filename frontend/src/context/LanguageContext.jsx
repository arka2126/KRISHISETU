import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('ks_language');
      if (saved && translations[saved]) {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'en';
  });

  const setLanguage = useCallback((langCode) => {
    if (translations[langCode]) {
      setLanguageState(langCode);
      try {
        localStorage.setItem('ks_language', langCode);
      } catch {
        // Ignore storage write error
      }
    }
  }, []);

  const t = useCallback((path, fallback = '') => {
    const keys = path.split('.');
    
    // 1. Try current language
    let cur = translations[language];
    for (const k of keys) {
      if (cur && typeof cur === 'object' && k in cur) {
        cur = cur[k];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && typeof cur === 'string') {
      return cur;
    }

    // 2. Fallback to English
    let eng = translations.en;
    for (const k of keys) {
      if (eng && typeof eng === 'object' && k in eng) {
        eng = eng[k];
      } else {
        eng = undefined;
        break;
      }
    }
    if (eng !== undefined && typeof eng === 'string') {
      return eng;
    }

    // 3. Fallback to provided fallback or the path itself
    return fallback || path;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    t,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
