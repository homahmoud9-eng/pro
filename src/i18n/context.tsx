"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "./en";
import { ar } from "./ar";

export type Locale = "ar" | "en";
export type TranslationDict = typeof en;

interface I18nContextType {
  locale: Locale;
  t: TranslationDict;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNested(obj: any, path: string): string {
  if (!path) return "";
  const parts = path.split(".");
  let curr = obj;
  for (const part of parts) {
    if (!curr || typeof curr !== "object") return path;
    curr = curr[part];
  }
  return typeof curr === "string" ? curr : path;
}

export function createT(dict: TranslationDict) {
  const fn = (path: string) => getNested(dict, path);
  return Object.assign(fn, dict);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    let saved = localStorage.getItem("preferred_locale") as Locale;
    if (!saved) {
      const match = document.cookie.match(/preferred_locale=([^;]+)/);
      if (match && (match[1] === "ar" || match[1] === "en")) {
        saved = match[1] as Locale;
      }
    }
    if (saved === "ar" || saved === "en") {
      setLocaleState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved === "ar" ? "ar-AE" : "en-AE";
      document.body.dir = saved === "ar" ? "rtl" : "ltr";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en-AE";
      document.body.dir = "ltr";
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("preferred_locale", newLocale);
    document.cookie = `preferred_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale === "ar" ? "ar-AE" : "en-AE";
    document.body.dir = newLocale === "ar" ? "rtl" : "ltr";
  };

  const toggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  const dict = locale === "ar" ? (ar as TranslationDict) : en;
  const t = createT(dict);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, t, dir, setLocale, toggleLocale, language: locale } as any}>
      <div dir={dir} className={locale === "ar" ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      language: "en" as Locale,
      t: createT(en) as any,
      dir: "ltr" as const,
      setLocale: () => {},
      toggleLocale: () => {},
    };
  }
  return {
    ...ctx,
    language: ctx.locale,
  };
}
