"use client";

import { useState } from "react";
import { askQuestion } from "@/lib/api";
import type { AskResult } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { AnswerCard } from "@/components/AnswerCard";
import { NeedsReviewState } from "@/components/NeedsReviewState";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { SourceCard } from "@/components/SourceCard";
import { VerificationBadge } from "@/components/VerificationBadge";

const EXAMPLES = {
  en: [
    "Is bank interest permissible?",
    "What is the ruling on fasting while traveling?",
    "How should missed prayers be made up?",
  ],
  ur: [
    "بینک کے سود اور منافع کا شرعی حکم کیا ہے؟",
    "سفر میں روزہ رکھنے کا کیا حکم ہے؟",
    "قضا نمازیں کیسے ادا کی جائیں؟",
  ],
};

export default function FatwasPage() {
  const { lang, locale, t } = useLang();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  async function submit() {
    setBusy(true);
    setError("");
    setResult(null);

    try {
      const answer = await askQuestion(query, lang);
      setResult(answer);
      try {
        const history = JSON.parse(
          localStorage.getItem("sanad-history") ?? "[]",
        ) as Array<{ query: string; result: AskResult }>;
        localStorage.setItem(
          "sanad-history",
          JSON.stringify([{ query, result: answer }, ...history].slice(0, 20)),
        );
      } catch {
        setError(t(
          "The answer was retrieved, but could not be saved to browser history.",
          "جواب حاصل ہو گیا، لیکن اسے براؤزر کی سابقہ فہرست میں محفوظ نہیں کیا جا سکا۔",
        ));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(
        "The Fatwa service could not be reached.",
        "فتویٰ کی خدمت سے رابطہ نہیں ہو سکا۔",
      ));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20" dir={locale.dir} lang={locale.code}>
      <section className="max-w-[800px]">
        <p className="text-[12px] uppercase tracking-[.18em] text-gold">Sanad · {t("Fatwa research", "فتویٰ کی تحقیق")}</p>
        <h1 className={`mt-4 text-4xl leading-[1.4] text-text sm:text-6xl ${lang === "ur" ? "font-urdu" : "font-display"}`}>
          {t("Ask about a Fatwa.", "فتویٰ کے بارے میں پوچھیے۔")}
        </h1>
        <p className={`mt-5 max-w-[60ch] text-[17px] leading-[2.2] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
          {t(
            "Search Islamic rulings and review the cited fatwa sources alongside each answer.",
            "شرعی مسائل کے جوابات تلاش کریں اور ہر جواب کے ساتھ مستند فتاویٰ کے مآخذ بھی دیکھیں۔",
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
        <label htmlFor="fatwa-query" className={`text-[15px] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("Your question", "آپ کا سوال")}
        </label>
        <textarea
          id="fatwa-query"
          dir={locale.dir}
          lang={locale.code}
          rows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && query.trim() && !busy) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={t("Ask a question about an Islamic ruling.", "کسی شرعی مسئلے کے بارے میں سوال پوچھیے۔")}
          className={`recessed mt-4 w-full resize-y p-4 text-[16px] leading-[2.2] text-text outline-none ${lang === "ur" ? "font-urdu" : ""}`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES[lang].map((example) => (
            <button
              key={example}
              type="button"
              dir={locale.dir}
              onClick={() => setQuery(example)}
              className={`rounded-[var(--radius-chip)] border border-line bg-ink-2 px-3 py-2 text-start text-text-muted transition-colors hover:border-gold/40 hover:text-text ${lang === "ur" ? "font-urdu text-[13px] leading-[2]" : "text-[13px]"}`}
            >
              {example}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-[13px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("Every grounded answer includes its source fatwas.", "مستند جواب کے ساتھ اس کے مآخذ بھی دکھائے جاتے ہیں۔")}
          </p>
          <button
            type="submit"
            disabled={!query.trim() || busy}
            className={`rounded-[var(--radius-chip)] bg-gold px-5 py-2.5 text-[15px] text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-not-allowed disabled:bg-line disabled:text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}
          >
            {busy ? t("Searching…", "تلاش جاری ہے…") : t("Ask Fatwa", "فتویٰ پوچھیں")}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className={`mt-5 max-w-[800px] rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-4 text-red-200 ${lang === "ur" ? "font-urdu" : ""}`}>
          {error}
        </p>
      )}

      {busy && (
        <div className="panel mt-8 max-w-[800px] p-6">
          <PipelineDiagram activeKey="verify" compact />
          <p className={`mt-5 text-center text-sm text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("Searching fatwa sources…", "فتاویٰ کے مآخذ میں تلاش جاری ہے…")}
          </p>
        </div>
      )}

      {result && (
        <section className="mt-8 max-w-[800px] space-y-6">
          {result.confidence === "grounded" ? (
            <AnswerCard
              answer={result.answer}
              englishTranslation={result.englishTranslation}
              citations={result.citations}
              activeCitation={activeCitation}
              onActivate={setActiveCitation}
            />
          ) : (
            <NeedsReviewState
              reason={result.citations.length ? "weak-match" : "no-sources"}
              sourceCount={result.citations.length}
            />
          )}
          {result.citations.length > 0 && (
            <aside aria-label={t("Fatwa verification and sources", "فتویٰ کی تصدیق اور مآخذ")} className="space-y-4">
              <VerificationBadge confidence={result.confidence} sourceCount={result.citations.length} />
              {result.citations.map((citation) => (
                <SourceCard
                  key={citation.n}
                  citation={citation}
                  active={activeCitation === citation.n}
                  onActivate={setActiveCitation}
                  showExcerpt={false}
                  showMatch={false}
                />
              ))}
            </aside>
          )}
        </section>
      )}
    </main>
  );
}
