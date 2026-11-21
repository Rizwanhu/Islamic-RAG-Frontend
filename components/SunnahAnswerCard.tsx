"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";

const AUTHOR = {
  en: "Maulana Shah Hakim Muhammad Akhtar",
  ur: "مولانا شاہ حکیم محمداختر",
};

export function SunnahAnswerCard({
  answer,
  englishTranslation,
  query,
}: {
  answer: string;
  englishTranslation?: string;
  query: string;
}) {
  const { lang, t } = useLang();
  const [showTranslation, setShowTranslation] = useState(false);
  const [fetchedTranslation, setFetchedTranslation] = useState("");
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const translation = englishTranslation?.trim() || fetchedTranslation;
  const canTranslate = Boolean(translation || /[\u0600-\u06ff]/.test(answer));

  async function toggleTranslation() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translation) {
      setShowTranslation(true);
      return;
    }

    setLoadingTranslation(true);
    setTranslationError(false);
    try {
      const response = await fetch("/api/sunnahs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, lang: "en" }),
      });
      if (!response.ok) throw new Error("The translation request failed.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("answer" in data) || typeof data.answer !== "string") {
        throw new Error("The translation response was invalid.");
      }

      const englishTranslation = "english_translation" in data
        && typeof data.english_translation === "string"
        ? data.english_translation.trim()
        : "";
      const translatedAnswer = englishTranslation || data.answer.trim();
      if (!translatedAnswer) throw new Error("The translation response was empty.");
      setFetchedTranslation(translatedAnswer);
      setShowTranslation(true);
    } catch {
      setTranslationError(true);
    } finally {
      setLoadingTranslation(false);
    }
  }

  return (
    <article className="rounded-[var(--radius-source)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-text-dim">
          {t(`By ${AUTHOR.en}`, `مصنف: ${AUTHOR.ur}`)}
        </p>
        {canTranslate && (
          <button
            type="button"
            aria-expanded={showTranslation}
            onClick={() => void toggleTranslation()}
            disabled={loadingTranslation}
            className="rounded-[var(--radius-chip)] border border-line px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-60"
          >
            {loadingTranslation
              ? t("Translating…", "ترجمہ جاری ہے…")
              : showTranslation
              ? t("Hide English", "انگریزی چھپائیں")
              : t("Translate to English", "انگریزی میں ترجمہ")}
          </button>
        )}
      </div>
      <p dir="auto" className={`mt-3 whitespace-pre-wrap text-[15px] leading-[2] text-text ${lang === "ur" ? "font-urdu" : ""}`}>
        {answer}
      </p>
      {translationError && (
        <p role="alert" className="mt-3 text-[12px] text-red-300">
          {t("Could not load the English translation. Please try again.", "انگریزی ترجمہ حاصل نہیں ہو سکا۔ دوبارہ کوشش کریں۔")}
        </p>
      )}
      {showTranslation && translation && (
        <div className="mt-4 border-t border-line pt-4" dir="ltr">
          <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-gold">
            {t("English translation", "انگریزی ترجمہ")}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.75] text-text">
            {translation}
          </p>
        </div>
      )}
    </article>
  );
}
