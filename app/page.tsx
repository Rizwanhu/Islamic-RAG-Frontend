"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { askQuestion } from "@/lib/api";
import type { AskResult } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { QueryInput, type QuestionCategory } from "@/components/QueryInput";
import { AnswerCard } from "@/components/AnswerCard";
import { SourceCard } from "@/components/SourceCard";
import { NeedsReviewState } from "@/components/NeedsReviewState";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PipelineDiagram } from "@/components/PipelineDiagram";

const sunnahResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      section: z.string(),
      snippet: z.string(),
    }),
  ),
});

type SunnahResponse = z.infer<typeof sunnahResponseSchema>;

async function askSunnah(query: string, lang: "en" | "ur"): Promise<SunnahResponse> {
  const response = await fetch("/api/sunnahs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, lang }),
  });

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("The Sunnah service is not configured.");
    }
    if (response.status === 502 || response.status === 504) {
      throw new Error("Could not reach the Sunnah service. Please try again.");
    }
    throw new Error("The Sunnah service did not return an answer. Please try again.");
  }

  const parsed = sunnahResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The Sunnah service returned an unexpected response.");
  }
  return parsed.data;
}

function settle<T>(request: Promise<T> | null) {
  return request
    ? request.then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason: unknown) => ({ status: "rejected" as const, reason }),
      )
    : Promise.resolve(null);
}

export default function Home() {
  const { t, lang, locale } = useLang();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<QuestionCategory>("all");
  const [result, setResult] = useState<{
    fatwa: AskResult | null;
    sunnah: SunnahResponse | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  async function submit() {
    setBusy(true);
    setErrors([]);
    setResult(null);
    try {
      const [fatwaOutcome, sunnahOutcome] = await Promise.all([
        settle(category !== "sunnah" ? askQuestion(query, lang) : null),
        settle(category !== "fatwa" ? askSunnah(query, lang) : null),
      ]);

      const fatwa = fatwaOutcome?.status === "fulfilled" ? fatwaOutcome.value : null;
      const sunnah = sunnahOutcome?.status === "fulfilled" ? sunnahOutcome.value : null;
      const requestErrors = [
        fatwaOutcome?.status === "rejected"
          ? fatwaOutcome.reason instanceof Error
            ? t(`Fatwa: ${fatwaOutcome.reason.message}`, `فتویٰ: ${fatwaOutcome.reason.message}`)
            : t("The Fatwa service could not be reached.", "فتویٰ کی خدمت سے رابطہ نہیں ہو سکا۔")
          : null,
        sunnahOutcome?.status === "rejected"
          ? sunnahOutcome.reason instanceof Error
            ? t(`Sunnah: ${sunnahOutcome.reason.message}`, `سنت: ${sunnahOutcome.reason.message}`)
            : t("The Sunnah service could not be reached.", "سنتوں کی خدمت سے رابطہ نہیں ہو سکا۔")
          : null,
      ].filter((message): message is string => message !== null);

      setErrors(requestErrors);
      if (fatwa || sunnah) {
        setResult({ fatwa, sunnah });
      }

      if (fatwa) {
        try {
          const history = JSON.parse(localStorage.getItem("sanad-history") ?? "[]") as Array<{ query: string; result: AskResult }>;
          localStorage.setItem("sanad-history", JSON.stringify([{ query, result: fatwa }, ...history].slice(0, 20)));
        } catch {
          setErrors((previous) => [...previous, t(
            "The answer was retrieved, but could not be saved to browser history.",
            "جواب حاصل ہو گیا، لیکن اسے براؤزر کی سابقہ فہرست میں محفوظ نہیں کیا جا سکا۔",
          )]);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen"><main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20">
      <section className="max-w-[760px]">
        <p className="text-[12px] uppercase tracking-[.18em] text-gold">Sanad · {t("Evidence before certainty", "یقین سے پہلے دلیل")}</p>
        <h1 dir={locale.dir} className="mt-4 font-display text-5xl leading-[1.05] text-text sm:text-7xl">{t("Ask. Retrieve. Verify.", "پوچھیے، تلاش کیجیے، تصدیق کیجیے۔")}</h1>
        <p className="mt-6 max-w-[58ch] text-[16px] leading-7 text-text-muted">{t("Ask about Sunnah or fiqh and get answers grounded in the relevant sources, with passages visible for inspection.", "سنت یا فقہ کے بارے میں سوال پوچھیے اور متعلقہ مستند ماخذ کے ساتھ جواب حاصل کیجیے۔")}</p>
      </section>
      <section aria-label={t("Choose a collection", "مجموعہ منتخب کریں")} className="mt-10 grid max-w-[760px] gap-4 sm:grid-cols-2">
        <Link href="/fatwas" className="panel block p-5 transition-colors hover:border-gold/40">
          <h2 className={`text-xl text-gold ${lang === "ur" ? "font-urdu" : "font-display"}`}>{t("Fatwa", "فتویٰ")}</h2>
          <p className={`mt-2 text-sm leading-6 text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("Search Islamic rulings and review their cited sources.", "شرعی مسائل کے جوابات اور ان کے مستند مآخذ تلاش کریں۔")}
          </p>
        </Link>
        <Link href="/sunnahs" className="panel block p-5 transition-colors hover:border-gold/40">
          <h2 className={`text-xl text-gold ${lang === "ur" ? "font-urdu" : "font-display"}`}>{t("Sunnah", "سنتیں")}</h2>
          <p className={`mt-2 text-sm leading-6 text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("Explore answers and passages from Pyarey Nabi ki Pyari Sunnatein.", "پیارے نبی ﷺ کی پیاری سنتیں کتاب سے جوابات اور اقتباسات تلاش کریں۔")}
          </p>
        </Link>
      </section>
      <section className="mt-12"><QueryInput value={query} onChange={setQuery} onSubmit={submit} busy={busy} category={category} onCategoryChange={setCategory} /></section>
      {errors.length > 0 && <div role="alert" className="mt-5 space-y-2 rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-4 text-red-200">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {busy && <div className="panel mt-8 p-6"><PipelineDiagram activeKey="verify" compact /><p className="mt-5 text-center text-sm text-text-muted">{t("Searching the selected sources…", "منتخب مآخذ میں تلاش جاری ہے…")}</p></div>}
      {result && <section className="mt-8 space-y-8">
        {result.fatwa && <section aria-labelledby="fatwa-answer-heading" className="space-y-6">
          <h2 id="fatwa-answer-heading" className="font-display text-2xl text-gold">{t("Fatwa answer", "فتویٰ کا جواب")}</h2>
          {result.fatwa.confidence === "grounded" ? <AnswerCard answer={result.fatwa.answer} citations={result.fatwa.citations} activeCitation={activeCitation} onActivate={setActiveCitation} /> : <NeedsReviewState reason={result.fatwa.citations.length ? "weak-match" : "no-sources"} sourceCount={result.fatwa.citations.length} />}
          {result.fatwa.citations.length > 0 && <aside aria-label={t("Fatwa verification and sources", "فتویٰ کی تصدیق اور مآخذ")} className="space-y-4">
            <div><VerificationBadge confidence={result.fatwa.confidence} sourceCount={result.fatwa.citations.length} /></div>
            {result.fatwa.citations.map((citation) => <SourceCard key={citation.n} citation={citation} active={activeCitation === citation.n} onActivate={setActiveCitation} showExcerpt={false} showMatch={false} />)}
          </aside>}
        </section>}
        {result.sunnah && <section aria-labelledby="sunnah-answer-heading" className="space-y-4">
          <h2 id="sunnah-answer-heading" className="font-display text-2xl text-gold">{t("Sunnah answer", "سنت کا جواب")}</h2>
          <article className="panel p-6 sm:p-8">
            <h3 className="font-display text-[26px] text-text">{t("Answer", "جواب")}</h3>
            <hr className="rule my-5" />
            <p dir="auto" className="whitespace-pre-wrap text-[16px] leading-[1.75] text-text">{result.sunnah.answer}</p>
          </article>
          {result.sunnah.sources.length > 0 && <aside aria-labelledby="sunnah-sources-heading" className="space-y-4">
            <h3 id="sunnah-sources-heading" className="font-display text-xl text-text">{t("Relevant Sunnah passages", "متعلقہ سنت کے اقتباسات")}</h3>
            {result.sunnah.sources.map((source, index) => <article key={`${source.section}-${index}`} className="rounded-[var(--radius-source)] border border-line bg-surface p-5">
              <h4 dir="auto" className="text-[16px] leading-[2] text-gold">{source.section}</h4>
              <p dir="auto" className="mt-3 whitespace-pre-wrap text-[15px] leading-[2.3] text-text-muted">{source.snippet}</p>
            </article>)}
          </aside>}
        </section>}
      </section>}
    </main>
    </div>
  );
}
