"use client";

import { useEffect, useRef, useState } from "react";
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
      section: z.string().optional(),
      snippet: z.string(),
    }),
  ),
});

type SunnahResponse = z.infer<typeof sunnahResponseSchema>;

type ConversationTurn = {
  id: number;
  query: string;
  category: QuestionCategory;
  status: "loading" | "complete";
  fatwa: AskResult | null;
  sunnah: SunnahResponse | null;
  errors: string[];
};

const SUNNAH_BOOK = {
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
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [pinnedTurns, setPinnedTurns] = useState<number[]>([]);
  const [highlightedTurns, setHighlightedTurns] = useState<number[]>([]);
  const [activeCitations, setActiveCitations] = useState<Record<number, number | null>>({});
  const [copyStatus, setCopyStatus] = useState<Record<number, "copied" | "error">>({});
  const [historyError, setHistoryError] = useState("");
  const nextTurnId = useRef(1);
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length > 0) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      conversationEnd.current?.scrollIntoView({ behavior, block: "end" });
    }
  }, [turns.length, busy]);

  async function submit() {
    const submittedQuery = query.trim();
    if (!submittedQuery || busy) return;

    const turnId = nextTurnId.current;
    nextTurnId.current += 1;
    const submittedCategory = category;
    setTurns((previous) => [...previous, {
      id: turnId,
      query: submittedQuery,
      category: submittedCategory,
      status: "loading",
      fatwa: null,
      sunnah: null,
      errors: [],
    }]);
    setQuery("");
    setHistoryError("");
    setBusy(true);
    try {
      const [fatwaOutcome, sunnahOutcome] = await Promise.all([
        settle(submittedCategory !== "sunnah" ? askQuestion(submittedQuery, lang) : null),
        settle(submittedCategory !== "fatwa" ? askSunnah(submittedQuery, lang) : null),
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

      setTurns((previous) => previous.map((turn) => turn.id === turnId
        ? { ...turn, status: "complete", fatwa, sunnah, errors: requestErrors }
        : turn,
      ));

      if (fatwa) {
        try {
          const history = JSON.parse(localStorage.getItem("sanad-history") ?? "[]") as Array<{ query: string; result: AskResult }>;
          localStorage.setItem("sanad-history", JSON.stringify([{ query: submittedQuery, result: fatwa }, ...history].slice(0, 20)));
        } catch {
          setHistoryError(t(
            "The answer was retrieved, but could not be saved to browser history.",
            "جواب حاصل ہو گیا، لیکن اسے براؤزر کی سابقہ فہرست میں محفوظ نہیں کیا جا سکا۔",
          ));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyTurn(turn: ConversationTurn) {
    const answer = [turn.fatwa?.answer, turn.sunnah?.answer]
      .filter((text): text is string => Boolean(text))
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(answer);
      setCopyStatus((previous) => ({ ...previous, [turn.id]: "copied" }));
    } catch {
      setCopyStatus((previous) => ({ ...previous, [turn.id]: "error" }));
    }
  }

  function startNewChat() {
    setTurns([]);
    setQuery("");
    setCategory("all");
    setPinnedTurns([]);
    setHighlightedTurns([]);
    setActiveCitations({});
    setCopyStatus({});
    setHistoryError("");
    nextTurnId.current = 1;
  }

  const pinnedMessages = turns.filter((turn) => pinnedTurns.includes(turn.id));

  return (
    <div className="min-h-screen">
      {turns.length === 0 ? (
        <main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:py-20">
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
          <section className="mt-12">
            <QueryInput value={query} onChange={setQuery} onSubmit={submit} busy={busy} category={category} onCategoryChange={setCategory} />
          </section>
        </main>
      ) : (
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1120px] flex-col px-5 pb-2 pt-8">
          <section className="mx-auto w-full max-w-[850px] flex-1">
            <header className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[.16em] text-gold">Sanad</p>
                <h1 className={`mt-1 text-xl text-text ${lang === "ur" ? "font-urdu" : "font-display"}`}>
                  {t("Research conversation", "تحقیقی گفتگو")}
                </h1>
              </div>
              <button
                type="button"
                onClick={startNewChat}
                disabled={busy}
                className={`rounded-[var(--radius-chip)] border border-line px-3 py-2 text-[13px] text-text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-50 ${lang === "ur" ? "font-urdu" : ""}`}
              >
                {t("New chat", "نئی گفتگو")}
              </button>
            </header>

            {historyError && (
              <p role="alert" className="mb-5 rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-3 text-[13px] text-red-200">
                {historyError}
              </p>
            )}

            {pinnedMessages.length > 0 && (
              <aside aria-label={t("Pinned answers", "پن کیے گئے جوابات")} className="panel mb-6 p-4">
                <h2 className={`text-[14px] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
                  {t("Pinned answers", "پن کیے گئے جوابات")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {pinnedMessages.map((turn) => (
                    <li key={turn.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-ink-2 px-3 py-2">
                      <a href={`#turn-${turn.id}`} className="min-w-0 text-[13px] text-text-muted hover:text-text">
                        <span className="block truncate">{turn.query}</span>
                        <span className="mt-1 block truncate text-text-dim">
                          {[turn.fatwa?.answer, turn.sunnah?.answer].filter(Boolean).join(" · ")}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setPinnedTurns((previous) => previous.filter((id) => id !== turn.id))}
                        className="shrink-0 text-[12px] text-text-dim hover:text-text"
                      >
                        {t("Unpin", "پن ہٹائیں")}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            <section aria-label={t("Conversation", "گفتگو")} className="space-y-8">
              {turns.map((turn) => {
                const sunnahAnswer = turn.sunnah?.answer;
                const pinned = pinnedTurns.includes(turn.id);
                const highlighted = highlightedTurns.includes(turn.id);

                return (
                  <article key={turn.id} id={`turn-${turn.id}`} className="scroll-mt-24">
                    <div className="mb-4 flex justify-end">
                      <p dir="auto" className={`max-w-[88%] rounded-2xl rounded-br-md bg-surface-2 px-4 py-3 text-[15px] leading-[1.8] text-text ${lang === "ur" ? "font-urdu" : ""}`}>
                        {turn.query}
                      </p>
                    </div>
                    <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-4">
                      <span aria-hidden="true" className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-gold">✦</span>
                      <section className={`min-w-0 rounded-2xl border p-4 transition-colors sm:p-5 ${highlighted ? "border-gold/55 bg-gold/[0.04]" : "border-line bg-surface/60"}`}>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <span className={`text-[12px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>
                            {turn.category === "all" ? t("Fatwa + Sunnah", "فتویٰ + سنت") : turn.category === "fatwa" ? t("Fatwa", "فتویٰ") : t("Sunnah", "سنت")}
                          </span>
                          {turn.status === "complete" && (turn.fatwa || turn.sunnah) && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                aria-pressed={pinned}
                                onClick={() => setPinnedTurns((previous) => pinned
                                  ? previous.filter((id) => id !== turn.id)
                                  : [...previous, turn.id],
                                )}
                                className={`rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] transition-colors ${pinned ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-text-muted hover:text-text"}`}
                              >
                                {pinned ? t("Pinned", "پن شدہ") : t("Pin", "پن کریں")}
                              </button>
                              <button
                                type="button"
                                aria-pressed={highlighted}
                                onClick={() => setHighlightedTurns((previous) => highlighted
                                  ? previous.filter((id) => id !== turn.id)
                                  : [...previous, turn.id],
                                )}
                                className={`rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] transition-colors ${highlighted ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-text-muted hover:text-text"}`}
                              >
                                {highlighted ? t("Highlighted", "نمایاں") : t("Highlight", "نمایاں کریں")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyTurn(turn)}
                                className="rounded-[var(--radius-chip)] border border-line px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:text-text"
                              >
                                {copyStatus[turn.id] === "copied" ? t("Copied", "کاپی ہو گیا") : t("Copy", "کاپی کریں")}
                              </button>
                            </div>
                          )}
                        </div>
                        {copyStatus[turn.id] === "error" && (
                          <p role="alert" className="mb-3 text-[12px] text-red-300">
                            {t("Could not copy this answer. Check your browser clipboard permissions.", "جواب کاپی نہیں ہو سکا۔ براہِ کرم براؤزر کی کلپ بورڈ اجازتیں دیکھیں۔")}
                          </p>
                        )}
                        {turn.status === "loading" && (
                          <div aria-live="polite" className="rounded-xl border border-line bg-ink-2 p-4">
                            <PipelineDiagram activeKey="verify" compact />
                            <p className={`mt-4 text-center text-[13px] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                              {t("Searching the selected sources…", "منتخب مآخذ میں تلاش جاری ہے…")}
                            </p>
                          </div>
                        )}
                        {turn.errors.map((error) => (
                          <p key={error} role="alert" className="mb-3 rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-3 text-[13px] text-red-200">
                            {error}
                          </p>
                        ))}
                        {turn.fatwa && (
                          <section aria-labelledby={`fatwa-answer-heading-${turn.id}`} className="mt-4 space-y-3">
                            <h3 id={`fatwa-answer-heading-${turn.id}`} className={`text-[16px] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
                              {t("Fatwa answer", "فتویٰ کا جواب")}
                            </h3>
                            {turn.fatwa.confidence === "grounded" ? (
                              <AnswerCard
                                answer={turn.fatwa.answer}
                                citations={turn.fatwa.citations}
                                activeCitation={activeCitations[turn.id] ?? null}
                                onActivate={(citation) => setActiveCitations((previous) => ({ ...previous, [turn.id]: citation }))}
                                idPrefix={`turn-${turn.id}`}
                              />
                            ) : (
                              <NeedsReviewState
                                reason={turn.fatwa.citations.length ? "weak-match" : "no-sources"}
                                sourceCount={turn.fatwa.citations.length}
                              />
                            )}
                            {turn.fatwa.citations.length > 0 && (
                              <aside aria-label={t("Fatwa verification and sources", "فتویٰ کی تصدیق اور مآخذ")} className="space-y-3">
                                <VerificationBadge confidence={turn.fatwa.confidence} sourceCount={turn.fatwa.citations.length} />
                                {turn.fatwa.citations.map((citation) => (
                                  <SourceCard
                                    key={citation.n}
                                    citation={citation}
                                    active={activeCitations[turn.id] === citation.n}
                                    onActivate={(value) => setActiveCitations((previous) => ({ ...previous, [turn.id]: value }))}
                                    showExcerpt={false}
                                    showMatch={false}
                                    idPrefix={`turn-${turn.id}`}
                                  />
                                ))}
                              </aside>
                            )}
                          </section>
                        )}
                        {turn.sunnah && (
                          <section aria-labelledby={`sunnah-answer-heading-${turn.id}`} className="mt-5 space-y-3">
                            <h3 id={`sunnah-answer-heading-${turn.id}`} className={`text-[16px] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
                              {t("Sunnah answer", "سنت کا جواب")}
                            </h3>
                            <article className="rounded-[var(--radius-source)] border border-line bg-surface p-4">
                              <p dir="auto" className={`whitespace-pre-wrap text-[15px] leading-[2] text-text ${lang === "ur" ? "font-urdu" : ""}`}>
                                {turn.sunnah.answer}
                              </p>
                            </article>
                            {turn.sunnah.sources.length > 0 && (
                              <aside aria-label={t("Sunnah references", "سنت کے حوالے")} className="space-y-3">
                                <h4 className={`text-[12px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>
                                  {t(SUNNAH_BOOK.en, SUNNAH_BOOK.ur)}
                                </h4>
                                {turn.sunnah.sources.map((source, index) => {
                                  const sectionTitle = getSectionTitle(source.section);
                                  const duplicate = sunnahAnswer !== undefined
                                    && isPassageAlreadyInAnswer(sunnahAnswer, source.snippet);
                                  if (duplicate && !sectionTitle) return null;
                                  return (
                                    <article key={`${source.section ?? "source"}-${index}`} className="rounded-[var(--radius-source)] border border-line bg-surface p-4">
                                      {sectionTitle && <h5 dir="auto" className={`text-[14px] leading-[2] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>{sectionTitle}</h5>}
                                      {!duplicate && (
                                        <p dir="auto" className={`mt-2 whitespace-pre-wrap text-[13px] leading-[2] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
                                          {source.snippet}
                                        </p>
                                      )}
                                    </article>
                                  );
                                })}
                              </aside>
                            )}
                          </section>
                        )}
                      </section>
                    </div>
                  </article>
                );
              })}
            </section>
            <div ref={conversationEnd} aria-hidden="true" className="h-4 scroll-mb-40" />
          </section>

          <div className="sticky bottom-0 z-20 mx-auto w-full max-w-[850px] bg-ink/90 pb-3 pt-3 backdrop-blur-md">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim() && !busy) void submit();
              }}
              className="rounded-2xl border border-line bg-surface p-3 shadow-[0_8px_32px_rgba(0,0,0,.24)] sm:p-4"
            >
              <label htmlFor="chat-query" className="sr-only">{t("Ask a follow-up question", "مزید سوال پوچھیے")}</label>
              <textarea
                id="chat-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && query.trim() && !busy) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                dir={locale.dir}
                lang={locale.code}
                rows={2}
                placeholder={t("Ask a follow-up question…", "مزید سوال پوچھیے…")}
                className={`w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-[1.8] text-text outline-none placeholder:text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}
                disabled={busy}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="chat-category" className="sr-only">{t("Search in", "تلاش کریں")}</label>
                  <select
                    id="chat-category"
                    value={category}
                    onChange={(event) => {
                      const selected = event.currentTarget.value;
                      if (selected === "all" || selected === "fatwa" || selected === "sunnah") setCategory(selected);
                    }}
                    className="recessed max-w-[180px] rounded-[var(--radius-chip)] px-3 py-2 text-[12px] text-text outline-none"
                  >
                    <option value="all">{t("Fatwa + Sunnah", "فتویٰ + سنت")}</option>
                    <option value="fatwa">{t("Fatwa", "فتویٰ")}</option>
                    <option value="sunnah">{t("Sunnah", "سنت")}</option>
                  </select>
                  <span className="hidden text-[11px] text-text-dim sm:inline">
                    {t("Enter to send · Shift+Enter for a new line", "بھیجنے کے لیے Enter · نئی سطر کے لیے Shift+Enter")}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || busy}
                  className={`rounded-[var(--radius-chip)] bg-gold px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-not-allowed disabled:bg-line disabled:text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}
                >
                  {busy ? t("Searching…", "تلاش جاری ہے…") : t("Send", "بھیجیں")}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}
    </div>
  );
}
