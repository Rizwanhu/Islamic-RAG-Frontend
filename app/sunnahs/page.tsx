"use client";

import { useState } from "react";
import { z } from "zod";

const responseSchema = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      section: z.string(),
      snippet: z.string(),
    }),
  ),
});

type SunnahResponse = z.infer<typeof responseSchema>;

export default function SunnahsPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SunnahResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const apiUrl = process.env.NEXT_PUBLIC_SUNNAH_API_URL;
    if (!apiUrl) {
      setError("The Sunnah service is not configured.");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("سنتوں کی خدمت سے جواب موصول نہیں ہوا۔ دوبارہ کوشش فرمائیں۔");
      }

      const data: unknown = await response.json();
      const parsed = responseSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error("سنتوں کی خدمت نے غیر متوقع جواب دیا۔");
      }
      setResult(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "سوال بھیجنے میں مسئلہ پیش آیا۔");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20" dir="rtl" lang="ur">
      <section className="max-w-[800px]">
        <p className="font-urdu text-[15px] text-gold">پیارے نبی ﷺ کی پیاری سنتیں</p>
        <h1 className="mt-5 font-urdu text-4xl leading-[1.8] text-text sm:text-6xl">
          پیارے نبی ﷺ کی پیاری سنتیں
        </h1>
        <p className="mt-5 max-w-[60ch] font-urdu text-[17px] leading-[2.3] text-text-muted">
          کتاب کے مستند حوالوں سے سنتوں کے بارے میں سوال پوچھیے۔
        </p>
      </section>

      <form
        className="panel mt-10 max-w-[800px] p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim() && !busy) void submit();
        }}
      >
        <label htmlFor="sunnah-query" className="font-urdu text-[15px] text-text-muted">
          آپ کون سی سنت کے بارے میں جاننا چاہتے ہیں؟
        </label>
        <textarea
          id="sunnah-query"
          rows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="مثلاً: کھانے پینے کے آداب اور سنتیں کیا ہیں؟"
          className="recessed mt-4 w-full resize-y p-4 font-urdu text-[16px] leading-[2.3] text-text outline-none"
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-urdu text-[13px] text-text-dim">
            ہر جواب کے ساتھ کتاب کے متعلقہ اقتباسات دکھائے جائیں گے۔
          </p>
          <button
            type="submit"
            disabled={!query.trim() || busy}
            className="rounded-[var(--radius-chip)] bg-gold px-5 py-2.5 font-urdu text-[15px] text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-not-allowed disabled:bg-line disabled:text-text-dim"
          >
            {busy ? "تلاش جاری ہے…" : "سوال پوچھیں"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-5 max-w-[800px] rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-4 font-urdu text-red-200">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8 grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="panel p-6">
            <h2 className="font-urdu text-2xl text-gold">جواب</h2>
            <p className="mt-4 whitespace-pre-wrap font-urdu text-[17px] leading-[2.4] text-text">
              {result.answer}
            </p>
          </article>
          <aside className="space-y-4">
            <h2 className="font-urdu text-xl text-text">کتاب سے متعلقہ اقتباسات</h2>
            {result.sources.map((source, index) => (
              <article key={`${source.section}-${index}`} className="rounded-[var(--radius-source)] border border-line bg-surface p-5">
                <h3 className="font-urdu text-[16px] leading-[2] text-gold">{source.section}</h3>
                <p className="mt-3 whitespace-pre-wrap font-urdu text-[15px] leading-[2.3] text-text-muted">
                  {source.snippet}
                </p>
              </article>
            ))}
          </aside>
        </section>
      )}
    </main>
  );
}
