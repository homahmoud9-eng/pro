"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "./en";
import { ar } from "./ar";

export type Locale = "ar" | "en";
export type TranslationDict = typeof en;

interface I18nContextType {
  locale: Locale;
  language: Locale;
  t: TranslationDict & ((path: string, params?: Record<string, string | number>) => string);
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  tRole: (role: string) => string;
  tStatus: (status: string) => string;
  tPriority: (priority: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date | null | undefined) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNested(
  dict: any,
  fallbackDict: any,
  path: string,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  if (!path) return "";
  const parts = path.split(".");
  let curr = dict;
  for (const part of parts) {
    if (!curr || typeof curr !== "object") {
      curr = undefined;
      break;
    }
    curr = curr[part];
  }

  let text = typeof curr === "string" ? curr : "";

  if (!text) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n warning]: Missing translation for key "${path}" in locale "${locale}"`);
    }
    let fb = fallbackDict;
    for (const part of parts) {
      if (!fb || typeof fb !== "object") {
        fb = undefined;
        break;
      }
      fb = fb[part];
    }
    text = typeof fb === "string" ? fb : path;
  }

  if (params && typeof text === "string") {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }

  return text;
}

export function createT(dict: TranslationDict, fallbackDict: TranslationDict, locale: Locale) {
  const fn = (path: string, params?: Record<string, string | number>) =>
    getNested(dict, fallbackDict, path, locale, params);
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
  const fallbackDict = locale === "ar" ? en : (ar as TranslationDict);
  const t = createT(dict, fallbackDict, locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  const tRole = (role: string) => {
    if (!role) return "";
    const rolesMap: Record<string, string> = dict.enums.roles;
    return rolesMap[role] || role;
  };

  const tStatus = (status: string) => {
    if (!status) return "";
    const empStatus: Record<string, string> = dict.enums.employeeStatus;
    const docStatus: Record<string, string> = dict.enums.documentStatus;
    const procStatus: Record<string, string> = dict.enums.procedureStatus;
    return empStatus[status] || docStatus[status] || procStatus[status] || status;
  };

  const tPriority = (priority: string) => {
    if (!priority) return "";
    const priorityMap: Record<string, string> = dict.enums.procedurePriority;
    return priorityMap[priority] || priority;
  };

  const formatCurrency = (amount: number) => {
    const formatted = (amount || 0).toLocaleString(locale === "ar" ? "ar-AE" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${dict.common.currency}`;
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB");
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        language: locale,
        t,
        dir,
        setLocale,
        toggleLocale,
        tRole,
        tStatus,
        tPriority,
        formatCurrency,
        formatDate,
      }}
    >
      <div dir={dir} className={locale === "ar" ? "font-arabic" : "font-sans"}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const dict = en;
    const fallbackDict = ar as TranslationDict;
    return {
      locale: "en" as Locale,
      language: "en" as Locale,
      t: createT(dict, fallbackDict, "en") as any,
      dir: "ltr" as const,
      setLocale: () => {},
      toggleLocale: () => {},
      tRole: (r: string) => r,
      tStatus: (s: string) => s,
      tPriority: (p: string) => p,
      formatCurrency: (n: number) => `${n} AED`,
      formatDate: (d: any) => String(d),
    };
  }
  return ctx;
}
