"use client";

import { useState } from "react";
import { askQuestion } from "@/lib/api";
import type { AskResult } from "@/lib/types";
import { useLang } from "@/lib/lang";
import { Nav } from "@/components/Nav";
import { QueryInput } from "@/components/QueryInput";
import { AnswerCard } from "@/components/AnswerCard";
import { SourceCard } from "@/components/SourceCard";
import { NeedsReviewState } from "@/components/NeedsReviewState";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export default function Home() {
  const { t, lang, locale } = useLang();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeCitation, setActiveCitation] = useState<number | null>(null);

  async function submit() {
    setBusy(true); setError(""); setResult(null);
    try {
      const next = await askQuestion(query, lang);
      setResult(next);
      const history = JSON.parse(localStorage.getItem("sanad-history") ?? "[]") as Array<{ query: string; result: AskResult }>;
      localStorage.setItem("sanad-history", JSON.stringify([{ query, result: next }, ...history].slice(0, 20)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen"><Nav /><main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20">
      <section className="max-w-[760px]">
        <p className="text-[12px] uppercase tracking-[.18em] text-gold">Sanad · {t("Evidence before certainty", "یقین سے پہلے دلیل")}</p>
        <h1 dir={locale.dir} className="mt-4 font-display text-5xl leading-[1.05] text-text sm:text-7xl">{t("Ask. Retrieve. Verify.", "پوچھیے، تلاش کیجیے، تصدیق کیجیے۔")}</h1>
        <p className="mt-6 max-w-[58ch] text-[16px] leading-7 text-text-muted">{t("A focused fiqh question-and-answer interface grounded in retrieved fatawa, with every passage visible for inspection.", "فقہی سوالات کے لیے ایسا نظام جو دستیاب فتاویٰ سے جواب اخذ کرتا ہے اور ہر ماخذ آپ کے سامنے رکھتا ہے۔")}</p>
      </section>
      <section className="mt-12"><QueryInput value={query} onChange={setQuery} onSubmit={submit} busy={busy} /></section>
      {error && <p role="alert" className="mt-5 rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-4 text-red-200">{error}</p>}
      {busy && <div className="panel mt-8 p-6"><PipelineDiagram activeKey="verify" compact /><p className="mt-5 text-center text-sm text-text-muted">{t("Contacting the verification service…", "تصدیقی خدمت سے رابطہ ہو رہا ہے…")}</p></div>}
      {result && <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>{result.confidence === "grounded" ? <AnswerCard answer={result.answer} citations={result.citations} activeCitation={activeCitation} onActivate={setActiveCitation} /> : <NeedsReviewState reason={result.citations.length ? "weak-match" : "no-sources"} sourceCount={result.citations.length} />}</div>
        <aside className="space-y-4"><div className="panel p-5"><VerificationBadge confidence={result.confidence} sourceCount={result.citations.length} /><h2 className="mt-5 font-display text-xl text-text">{t("Retrieved sources", "دستیاب مآخذ")}</h2></div>{result.citations.map((citation) => <SourceCard key={citation.n} citation={citation} active={activeCitation === citation.n} onActivate={setActiveCitation} />)}</aside>
      </section>}
    </main>
    </div>
  );
}
