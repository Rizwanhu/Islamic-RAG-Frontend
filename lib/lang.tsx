"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "./types";

export const LOCALES = [
  { code: "en" as const, label: "English", dir: "ltr" as const },
  { code: "ur" as const, label: "اردو", dir: "rtl" as const },
];

const LangContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  locale: (typeof LOCALES)[number];
  t: (en: string, ur: string) => string;
} | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("sanad-language");
    if (saved === "en" || saved === "ur") setLangState(saved);
  }, []);
  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem("sanad-language", next);
  };
  const locale = LOCALES.find((item) => item.code === lang) ?? LOCALES[0];
  return <LangContext.Provider value={{ lang, setLang, locale, t: (en, ur) => (lang === "ur" ? ur : en) }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside LangProvider");
  return value;
}

export function isRtlText(value: string) { return /[\u0600-\u06ff]/.test(value); }