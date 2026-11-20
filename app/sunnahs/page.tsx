"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useLang } from "@/lib/lang";

const QUESTION_SUGGESTIONS = [
  {
    en: "What are the Sunnahs of eating and drinking?",
    ur: "کھانے پینے کی مسنون آداب کیا ہیں؟",
  },
  {
    en: "What should I recite before going to sleep?",
    ur: "سونے سے پہلے کون سی دعائیں پڑھنی چاہییں؟",
  },
  {
    en: "How did the Prophet ﷺ greet others?",
    ur: "نبی کریم ﷺ لوگوں کو کس طرح سلام کرتے تھے؟",
  },
  {
    en: "What are the Sunnahs for entering and leaving the home?",
    ur: "گھر میں داخل ہونے اور نکلنے کی سنتیں کیا ہیں؟",
  },
  {
    en: "What is the Sunnah way to drink water?",
    ur: "پانی پینے کا مسنون طریقہ کیا ہے؟",
  },
  {
    en: "Which Sunnahs should I follow when waking up?",
    ur: "بیدار ہونے کے بعد کون سی سنتوں پر عمل کرنا چاہیے؟",
  },
  {
    en: "What are the Sunnahs of using the masjid?",
    ur: "مسجد جانے اور وہاں رہنے کی سنتیں کیا ہیں؟",
  },
  {
    en: "What guidance does the book give about the miswak?",
    ur: "مسواک کے بارے میں کتاب میں کیا رہنمائی دی گئی ہے؟",
  },
];

const SUGGESTIONS_PER_VIEW = 4;
const SUGGESTION_OFFSET_KEY = "sunnah-suggestion-offset";
const SUNNAH_BOOK_TITLE = {
  en: "Pyarey Nabi ki Pyari Sunnatein",
  ur: "پیارے نبی ﷺ کی پیاری سنتیں",
};

function getSectionTitle(section?: string) {
  const title = section?.trim();
  return title && !/\$\{[^}]*\}|\{\{[^}]*\}\}/.test(title) ? title : null;
}

function normalizePassageText(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{M}\p{P}\p{S}\p{Z}\p{Cf}]/gu, "");
}

function isPassageAlreadyInAnswer(answer: string, snippet: string) {
  const normalizedSnippet = normalizePassageText(snippet);
  return normalizedSnippet.length >= 40
    && normalizePassageText(answer).includes(normalizedSnippet);
}

function getNextSuggestionOffset() {
  try {
    const storedOffset = Number(sessionStorage.getItem(SUGGESTION_OFFSET_KEY));
    const offset = Number.isInteger(storedOffset) && storedOffset >= 0
      ? storedOffset % QUESTION_SUGGESTIONS.length
      : 0;
    sessionStorage.setItem(
      SUGGESTION_OFFSET_KEY,
      String((offset + SUGGESTIONS_PER_VIEW) % QUESTION_SUGGESTIONS.length),
    );
    return offset;
  } catch {
    return Math.floor(Math.random() * QUESTION_SUGGESTIONS.length);
  }
}

const responseSchema = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      section: z.string().optional(),
      snippet: z.string(),
    }),
  ),
});

type SunnahResponse = z.infer<typeof responseSchema>;

export default function SunnahsPage() {
  const { lang, locale, t } = useLang();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SunnahResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestionOffset, setSuggestionOffset] = useState<number | null>(null);
  const queryInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSuggestionOffset(getNextSuggestionOffset());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const suggestions = suggestionOffset === null
    ? []
    : Array.from({ length: SUGGESTIONS_PER_VIEW }, (_, index) =>
        QUESTION_SUGGESTIONS[(suggestionOffset + index) % QUESTION_SUGGESTIONS.length],
      );

  async function submit() {
    setBusy(true);
    setError("");
    setResult(null);

    try {
      console.log("[Sunnah page] Sending question to /api/sunnahs.", {
        language: lang,
        queryLength: query.trim().length,
      });
      const response = await fetch("/api/sunnahs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, lang }),
      });
      console.log("[Sunnah page] API response received.", {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error(t(
            "The Sunnah service is not configured.",
            "سنتوں کی خدمت ترتیب نہیں دی گئی۔",
          ));
        }
        if (response.status === 502 || response.status === 504) {
          throw new Error(t(
            "Could not reach the Sunnah service. Please check that the backend is running and try again.",
            "سنتوں کی خدمت سے رابطہ نہیں ہو سکا۔ براہِ کرم یقینی بنائیں کہ بیک اینڈ چل رہا ہے، پھر دوبارہ کوشش کریں۔",
          ));
        }
        throw new Error(t(
          "The Sunnah service did not return an answer. Please try again.",
          "سنتوں کی خدمت سے جواب موصول نہیں ہوا۔ دوبارہ کوشش فرمائیں۔",
        ));
      }

      const data: unknown = await response.json();
      const parsed = responseSchema.safeParse(data);
      if (!parsed.success) {
        console.log("[Sunnah page] API response did not match expected shape.", {
          issues: parsed.error.issues,
        });
        throw new Error(t(
          "The Sunnah service returned an unexpected response.",
          "سنتوں کی خدمت نے غیر متوقع جواب دیا۔",
        ));
      }
      console.log("[Sunnah page] Answer ready.", {
        answerLength: parsed.data.answer.length,
        sourceCount: parsed.data.sources.length,
      });
      setResult(parsed.data);
    } catch (cause) {
      console.log("[Sunnah page] Request failed.", {
        error: cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause),
      });
      setError(cause instanceof Error ? cause.message : t(
        "Something went wrong while sending your question.",
        "سوال بھیجنے میں مسئلہ پیش آیا۔",
      ));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20" dir={locale.dir} lang={locale.code}>
      <section className="max-w-[800px]">
        <h1 className={`mt-5 text-4xl leading-[1.8] text-text sm:text-6xl ${lang === "ur" ? "font-urdu" : "font-display"}`}>
          {t(SUNNAH_BOOK_TITLE.en, SUNNAH_BOOK_TITLE.ur)}
        </h1>
        <p className={`mt-5 max-w-[60ch] text-[17px] leading-[2.3] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
          {t(
            "Ask a question to find the relevant Sunnah and its passage.",
            "متعلقہ سنت اور اس کا اقتباس تلاش کرنے کے لیے سوال پوچھیے۔",
          )}
        </p>
      </section>

      <form
        className="panel mt-10 max-w-[800px] p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim() && !busy) void submit();
        }}
      >
        <label htmlFor="sunnah-query" className={`text-[15px] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("What would you like to know about the Sunnah?", "آپ کون سی سنت کے بارے میں جاننا چاہتے ہیں؟")}
        </label>
        <textarea
          id="sunnah-query"
          ref={queryInput}
          dir={locale.dir}
          lang={locale.code}
          rows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(
            "For example: What are the Sunnahs and etiquettes of eating and drinking?",
            "مثلاً: کھانے پینے کے آداب اور سنتیں کیا ہیں؟",
          )}
          className={`recessed mt-4 w-full resize-y p-4 text-[16px] leading-[2.3] text-text outline-none ${lang === "ur" ? "font-urdu" : ""}`}
        />
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[13px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("Try one of these questions", "ان میں سے کوئی سوال منتخب کریں")}
            </p>
            <button
              type="button"
              onClick={() => setSuggestionOffset(getNextSuggestionOffset())}
              className={`link-quiet text-[13px] ${lang === "ur" ? "font-urdu" : ""}`}
            >
              {t("More questions", "مزید سوالات")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const text = suggestion[lang];
              return (
                <button
                  key={suggestion.en}
                  type="button"
                  dir={locale.dir}
                  onClick={() => {
                    setQuery(text);
                    queryInput.current?.focus();
                  }}
                  className={`rounded-[var(--radius-chip)] border border-line bg-ink-2 px-3 py-2 text-start text-text-muted transition-colors hover:border-gold/40 hover:text-text ${lang === "ur" ? "font-urdu text-[13px] leading-[2]" : "text-[13px]"}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-[13px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>
            {t(
              "Relevant passages from the book will appear with each answer.",
              "ہر جواب کے ساتھ کتاب کے متعلقہ اقتباسات دکھائے جائیں گے۔",
            )}
          </p>
          <button
            type="submit"
            disabled={!query.trim() || busy}
            className={`rounded-[var(--radius-chip)] bg-gold px-5 py-2.5 text-[15px] text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-not-allowed disabled:bg-line disabled:text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}
          >
            {busy ? t("Searching…", "تلاش جاری ہے…") : t("Ask question", "سوال پوچھیں")}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={`mt-5 max-w-[800px] rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-4 text-red-200 ${lang === "ur" ? "font-urdu" : ""}`}>
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8 grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="panel p-6">
            <h2 className={`text-2xl text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
              {t("Answer", "جواب")}
            </h2>
            <p dir="auto" className={`mt-4 whitespace-pre-wrap text-[17px] leading-[2.4] text-text ${lang === "ur" ? "font-urdu" : ""}`}>
              {result.answer}
            </p>
          </article>
          <aside className="space-y-4">
            <h2 className={`text-xl text-text ${lang === "ur" ? "font-urdu" : ""}`}>
              {t(SUNNAH_BOOK_TITLE.en, SUNNAH_BOOK_TITLE.ur)}
            </h2>
            {result.sources.map((source, index) => {
              const sectionTitle = getSectionTitle(source.section);
              const duplicateSnippet = isPassageAlreadyInAnswer(result.answer, source.snippet);
              if (duplicateSnippet && !sectionTitle) return null;

              return (
                <article key={`${source.section ?? "source"}-${index}`} className="rounded-[var(--radius-source)] border border-line bg-surface p-5">
                  {sectionTitle && (
                    <h3 dir="auto" className={`text-[15px] leading-[2] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
                      {sectionTitle}
                    </h3>
                  )}
                  {!duplicateSnippet && (
                    <p dir="auto" className={`mt-3 whitespace-pre-wrap text-[15px] leading-[2.3] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                      {source.snippet}
                    </p>
                  )}
                </article>
              );
            })}
          </aside>
        </section>
      )}
    </main>
  );
}
