"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { AnswerCard } from "@/components/AnswerCard";
import { NeedsReviewState } from "@/components/NeedsReviewState";
import { SourceCard } from "@/components/SourceCard";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useLang } from "@/lib/lang";
import { askQuestion } from "@/lib/api";
import type { AskResult } from "@/lib/types";

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
type Collection = "fatwa" | "sunnah" | "both";
type Outcome<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

type Comparison = {
  id: string;
  query: string;
  collection: Collection;
  status: "idle" | "loading" | "complete";
  fatwa: AskResult | null;
  sunnah: SunnahResponse | null;
  fatwaError: string | null;
  sunnahError: string | null;
};

const SUNNAH_BOOK = {
  en: "Pyarey Nabi ki Pyari Sunnatein",
  ur: "پیارے نبی ﷺ کی پیاری سنتیں",
};

function createComparison(id: string): Comparison {
  return {
    id,
    query: "",
    collection: "both",
    status: "idle",
    fatwa: null,
    sunnah: null,
    fatwaError: null,
    sunnahError: null,
  };
}

async function askSunnah(query: string, lang: "en" | "ur"): Promise<SunnahResponse> {
  const response = await fetch("/api/sunnahs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, lang }),
  });

  if (!response.ok) {
    if (response.status === 503) throw new Error("The Sunnah service is not configured.");
    if (response.status === 502 || response.status === 504) {
      throw new Error("Could not reach the Sunnah service. Please try again.");
    }
    throw new Error("The Sunnah service did not return an answer. Please try again.");
  }

  const parsed = sunnahResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("The Sunnah service returned an unexpected response.");
  return parsed.data;
}

async function settle<T>(request: Promise<T> | null): Promise<Outcome<T> | null> {
  if (!request) return null;
  try {
    return { status: "fulfilled", value: await request };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

function outcomeError(outcome: Outcome<unknown> | null, fallback: string) {
  if (outcome?.status !== "rejected") return null;
  return outcome.reason instanceof Error ? outcome.reason.message : fallback;
}

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

function MessageActions({
  pinned,
  highlighted,
  onPin,
  onHighlight,
}: {
  pinned: boolean;
  highlighted: boolean;
  onPin: () => void;
  onHighlight: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="mb-2 flex justify-end gap-2">
      <button
        type="button"
        aria-pressed={pinned}
        onClick={onPin}
        className={`rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] transition-colors ${pinned ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-text-muted hover:text-text"}`}
      >
        {pinned ? t("Pinned", "پن شدہ") : t("Pin", "پن کریں")}
      </button>
      <button
        type="button"
        aria-pressed={highlighted}
        onClick={onHighlight}
        className={`rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] transition-colors ${highlighted ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-text-muted hover:text-text"}`}
      >
        {highlighted ? t("Highlighted", "نمایاں") : t("Highlight", "نمایاں کریں")}
      </button>
    </div>
  );
}

export default function ComparePage() {
  const { lang, locale, t } = useLang();
  const [comparisons, setComparisons] = useState<Comparison[]>([
    createComparison("question-1"),
    createComparison("question-2"),
  ]);
  const nextId = useRef(3);
  const [isRunning, setIsRunning] = useState(false);
  const [formError, setFormError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [activeCitations, setActiveCitations] = useState<Record<string, number | null>>({});

  function updateComparison(id: string, update: (comparison: Comparison) => Comparison) {
    setComparisons((current) => current.map((comparison) =>
      comparison.id === id ? update(comparison) : comparison,
    ));
  }

  function clearComparisonMarks(id: string) {
    setPinnedIds((current) => current.filter((messageId) => !messageId.startsWith(`${id}-`)));
    setHighlightedIds((current) => current.filter((messageId) => !messageId.startsWith(`${id}-`)));
    setActiveCitations((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function addComparison() {
    const id = `question-${nextId.current}`;
    nextId.current += 1;
    setComparisons((current) => [...current, createComparison(id)]);
  }

  function removeComparison(id: string) {
    setComparisons((current) => current.length > 2
      ? current.filter((comparison) => comparison.id !== id)
      : current,
    );
    setPinnedIds((current) => current.filter((messageId) => !messageId.startsWith(`${id}-`)));
    setHighlightedIds((current) => current.filter((messageId) => !messageId.startsWith(`${id}-`)));
  }

  function toggleMessageState(id: string, setState: (update: (current: string[]) => string[]) => void) {
    setState((current) => current.includes(id)
      ? current.filter((messageId) => messageId !== id)
      : [...current, id],
    );
  }

  async function runComparisons() {
    if (comparisons.some((comparison) => !comparison.query.trim())) {
      setFormError(t(
        "Enter a question in every comparison card before starting.",
        "موازنہ شروع کرنے سے پہلے ہر خانے میں سوال درج کریں۔",
      ));
      return;
    }

    setFormError("");
    setHistoryError("");
    setIsRunning(true);
    setComparisons((current) => current.map((comparison) => ({
      ...comparison,
      status: "loading",
      fatwa: null,
      sunnah: null,
      fatwaError: null,
      sunnahError: null,
    })));
    setPinnedIds([]);
    setHighlightedIds([]);

    try {
      const outcomes = await Promise.all(comparisons.map(async (comparison) => {
        const query = comparison.query.trim();
        const [fatwaOutcome, sunnahOutcome] = await Promise.all([
          settle(comparison.collection !== "sunnah" ? askQuestion(query, lang) : null),
          settle(comparison.collection !== "fatwa" ? askSunnah(query, lang) : null),
        ]);
        return {
          ...comparison,
          status: "complete" as const,
          fatwa: fatwaOutcome?.status === "fulfilled" ? fatwaOutcome.value : null,
          sunnah: sunnahOutcome?.status === "fulfilled" ? sunnahOutcome.value : null,
          fatwaError: outcomeError(
            fatwaOutcome,
            t("The Fatwa service could not be reached.", "فتویٰ کی خدمت سے رابطہ نہیں ہو سکا۔"),
          ),
          sunnahError: outcomeError(
            sunnahOutcome,
            t("The Sunnah service could not be reached.", "سنتوں کی خدمت سے رابطہ نہیں ہو سکا۔"),
          ),
        };
      }));

      setComparisons(outcomes);

      const fatwaHistory = outcomes.flatMap((outcome) =>
        outcome.fatwa ? [{ query: outcome.query.trim(), result: outcome.fatwa }] : [],
      );
      if (fatwaHistory.length) {
        try {
          const history = JSON.parse(
            localStorage.getItem("sanad-history") ?? "[]",
          ) as Array<{ query: string; result: AskResult }>;
          localStorage.setItem(
            "sanad-history",
            JSON.stringify([...fatwaHistory, ...history].slice(0, 20)),
          );
        } catch {
          setHistoryError(t(
            "Answers were retrieved, but could not be saved to browser history.",
            "جوابات حاصل ہو گئے، لیکن انہیں براؤزر کی سابقہ فہرست میں محفوظ نہیں کیا جا سکا۔",
          ));
        }
      }
    } finally {
      setIsRunning(false);
    }
  }

  const pinnedMessages = comparisons.flatMap((comparison) => {
    const messages: { id: string; question: string; source: string; answer: string }[] = [];
    if (comparison.fatwa && pinnedIds.includes(`${comparison.id}-fatwa`)) {
      messages.push({
        id: `${comparison.id}-fatwa`,
        question: comparison.query,
        source: t("Fatwa", "فتویٰ"),
        answer: comparison.fatwa.answer,
      });
    }
    if (comparison.sunnah && pinnedIds.includes(`${comparison.id}-sunnah`)) {
      messages.push({
        id: `${comparison.id}-sunnah`,
        question: comparison.query,
        source: t("Sunnah", "سنت"),
        answer: comparison.sunnah.answer,
      });
    }
    return messages;
  });

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:py-14" dir={locale.dir} lang={locale.code}>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <p className="text-[12px] uppercase tracking-[.18em] text-gold">Sanad · {t("Compare answers", "جوابات کا موازنہ")}</p>
          <h1 className={`mt-3 text-4xl leading-[1.35] text-text sm:text-6xl ${lang === "ur" ? "font-urdu" : "font-display"}`}>
            {t("Compare questions side by side.", "سوالات کے جوابات کا ساتھ ساتھ موازنہ کریں۔")}
          </h1>
          <p className={`mt-4 max-w-[65ch] text-[16px] leading-7 text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
            {t(
              "Ask different questions at the same time. Choose Fatwa, Sunnah, or both for each question.",
              "ایک وقت میں مختلف سوالات پوچھیں۔ ہر سوال کے لیے فتویٰ، سنت یا دونوں مآخذ منتخب کریں۔",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addComparison}
            disabled={isRunning}
            className="rounded-[var(--radius-chip)] border border-line px-4 py-2.5 text-[14px] text-text transition-colors hover:border-gold/50 disabled:opacity-50"
          >
            + {t("Add question", "سوال شامل کریں")}
          </button>
          <button
            type="button"
            onClick={() => void runComparisons()}
            disabled={isRunning}
            className="rounded-[var(--radius-chip)] bg-gold px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-wait disabled:opacity-60"
          >
            {isRunning ? t("Comparing…", "موازنہ جاری ہے…") : t("Compare answers", "جوابات کا موازنہ کریں")}
          </button>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-surface/60 px-4 py-3">
        <p className={`text-[13px] text-text-muted ${lang === "ur" ? "font-urdu" : ""}`}>
          {t("All question cards run in parallel. At least two questions are kept for comparison.", "تمام سوالات بیک وقت تلاش ہوں گے۔ موازنہ کے لیے کم از کم دو سوالات رکھے گئے ہیں۔")}
        </p>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => {
            setComparisons([createComparison("question-1"), createComparison("question-2")]);
            nextId.current = 3;
            setPinnedIds([]);
            setHighlightedIds([]);
            setActiveCitations({});
            setFormError("");
            setHistoryError("");
          }}
          className="text-[13px] text-text-dim transition-colors hover:text-text disabled:opacity-50"
        >
          {t("Reset comparison", "موازنہ دوبارہ شروع کریں")}
        </button>
      </div>

      {formError && <p role="alert" className="mt-4 rounded-[var(--radius-chip)] border border-gold/40 bg-gold/10 p-3 text-[14px] text-gold">{formError}</p>}
      {historyError && <p role="alert" className="mt-4 rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-3 text-[14px] text-red-200">{historyError}</p>}

      {pinnedMessages.length > 0 && (
        <section aria-labelledby="pinned-heading" className="panel mt-6 p-5">
          <h2 id="pinned-heading" className={`text-lg text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
            {t("Pinned answers", "پن کیے گئے جوابات")} · {pinnedMessages.length}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {pinnedMessages.map((message) => (
              <li key={message.id} className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-chip)] border border-line bg-ink-2 p-3">
                <a href={`#${message.id}`} className="min-w-0 text-[13px] text-text-muted hover:text-text">
                  <span className="block text-gold">{message.source} · {message.question}</span>
                  <span className="mt-1 block truncate">{message.answer}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPinnedIds((current) => current.filter((id) => id !== message.id))}
                  className="shrink-0 text-[12px] text-text-dim hover:text-text"
                >
                  {t("Unpin", "پن ہٹائیں")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={t("Question comparisons", "سوالات کا موازنہ")} className="mt-6 grid items-start gap-5 lg:grid-cols-2">
        {comparisons.map((comparison, index) => {
          const sunnah = comparison.sunnah;
          return (
          <article key={comparison.id} className="panel min-w-0 overflow-hidden">
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className={`text-base font-medium text-text ${lang === "ur" ? "font-urdu" : ""}`}>
                {t("Question", "سوال")} {index + 1}
              </h2>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`${comparison.id}-collection`}>
                  {t("Search collection", "مآخذ منتخب کریں")}
                </label>
                <select
                  id={`${comparison.id}-collection`}
                  value={comparison.collection}
                  disabled={isRunning}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (value === "fatwa" || value === "sunnah" || value === "both") {
                      updateComparison(comparison.id, (current) => ({
                        ...current,
                        collection: value,
                        status: "idle",
                        fatwa: null,
                        sunnah: null,
                        fatwaError: null,
                        sunnahError: null,
                      }));
                      clearComparisonMarks(comparison.id);
                    }
                  }}
                  className="recessed max-w-[140px] px-2.5 py-2 text-[12px] text-text outline-none focus:border-gold/60"
                >
                  <option value="both">{t("Fatwa + Sunnah", "فتویٰ + سنت")}</option>
                  <option value="fatwa">{t("Fatwa only", "صرف فتویٰ")}</option>
                  <option value="sunnah">{t("Sunnah only", "صرف سنت")}</option>
                </select>
                <button
                  type="button"
                  aria-label={t(`Remove question ${index + 1}`, `سوال ${index + 1} حذف کریں`)}
                  disabled={isRunning || comparisons.length <= 2}
                  onClick={() => removeComparison(comparison.id)}
                  className="rounded-full px-2 py-1 text-[18px] text-text-dim hover:text-text disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="p-5">
              <label className="sr-only" htmlFor={`${comparison.id}-query`}>
                {t(`Question ${index + 1}`, `سوال ${index + 1}`)}
              </label>
              <textarea
                id={`${comparison.id}-query`}
                rows={3}
                dir={locale.dir}
                lang={locale.code}
                disabled={isRunning}
                value={comparison.query}
                onChange={(event) => {
                  const query = event.currentTarget.value;
                  updateComparison(comparison.id, (current) => ({
                    ...current,
                    query,
                    status: "idle",
                    fatwa: null,
                    sunnah: null,
                    fatwaError: null,
                    sunnahError: null,
                  }));
                  clearComparisonMarks(comparison.id);
                }}
                placeholder={t("Write a question to compare…", "موازنہ کے لیے سوال درج کریں…")}
                className={`recessed w-full resize-y p-3.5 text-[15px] leading-[1.8] text-text outline-none focus:border-gold/60 ${lang === "ur" ? "font-urdu" : ""}`}
              />
              {comparison.status === "loading" && (
                <p role="status" className={`mt-3 text-[13px] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>
                  {t("Searching selected sources…", "منتخب مآخذ میں تلاش جاری ہے…")}
                </p>
              )}
              {comparison.status === "complete" && (
                <div className="mt-5 space-y-5 border-t border-line pt-5">
                  {comparison.fatwaError && <p role="alert" className="rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-3 text-[13px] text-red-200">{t("Fatwa", "فتویٰ")}: {comparison.fatwaError}</p>}
                  {comparison.fatwa && (
                    <section aria-label={t("Fatwa answer", "فتویٰ کا جواب")}>
                      <div
                        id={`${comparison.id}-fatwa`}
                        className={`rounded-[var(--radius-source)] border p-3 transition-colors ${highlightedIds.includes(`${comparison.id}-fatwa`) ? "border-gold/60 bg-gold/5" : "border-line"}`}
                      >
                        <MessageActions
                          pinned={pinnedIds.includes(`${comparison.id}-fatwa`)}
                          highlighted={highlightedIds.includes(`${comparison.id}-fatwa`)}
                          onPin={() => toggleMessageState(`${comparison.id}-fatwa`, setPinnedIds)}
                          onHighlight={() => toggleMessageState(`${comparison.id}-fatwa`, setHighlightedIds)}
                        />
                        {comparison.fatwa.confidence === "grounded" ? (
                          <AnswerCard
                            answer={comparison.fatwa.answer}
                            citations={comparison.fatwa.citations}
                            activeCitation={activeCitations[comparison.id] ?? null}
                            onActivate={(citation) => setActiveCitations((current) => ({ ...current, [comparison.id]: citation }))}
                            idPrefix={comparison.id}
                          />
                        ) : (
                          <NeedsReviewState
                            reason={comparison.fatwa.citations.length ? "weak-match" : "no-sources"}
                            sourceCount={comparison.fatwa.citations.length}
                          />
                        )}
                      </div>
                      {comparison.fatwa.citations.length > 0 && (
                        <aside className="mt-3 space-y-3">
                          <VerificationBadge confidence={comparison.fatwa.confidence} sourceCount={comparison.fatwa.citations.length} />
                          {comparison.fatwa.citations.map((citation) => (
                            <SourceCard
                              key={citation.n}
                              citation={citation}
                              active={activeCitations[comparison.id] === citation.n}
                              onActivate={(value) => setActiveCitations((current) => ({ ...current, [comparison.id]: value }))}
                              showExcerpt={false}
                              showMatch={false}
                              idPrefix={comparison.id}
                            />
                          ))}
                        </aside>
                      )}
                    </section>
                  )}
                  {comparison.sunnahError && <p role="alert" className="rounded-[var(--radius-chip)] border border-red-400/40 bg-red-950/30 p-3 text-[13px] text-red-200">{t("Sunnah", "سنت")}: {comparison.sunnahError}</p>}
                  {sunnah && (
                    <section aria-label={t("Sunnah answer", "سنت کا جواب")}>
                      <div
                        id={`${comparison.id}-sunnah`}
                        className={`rounded-[var(--radius-source)] border p-3 transition-colors ${highlightedIds.includes(`${comparison.id}-sunnah`) ? "border-gold/60 bg-gold/5" : "border-line"}`}
                      >
                        <MessageActions
                          pinned={pinnedIds.includes(`${comparison.id}-sunnah`)}
                          highlighted={highlightedIds.includes(`${comparison.id}-sunnah`)}
                          onPin={() => toggleMessageState(`${comparison.id}-sunnah`, setPinnedIds)}
                          onHighlight={() => toggleMessageState(`${comparison.id}-sunnah`, setHighlightedIds)}
                        />
                        <article className="rounded-[var(--radius-source)] border border-line bg-surface p-4">
                          <h3 className={`text-[17px] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>{t("Sunnah answer", "سنت کا جواب")}</h3>
                          <p dir="auto" className={`mt-3 whitespace-pre-wrap text-[14px] leading-[2.1] text-text ${lang === "ur" ? "font-urdu" : ""}`}>
                            {sunnah.answer}
                          </p>
                        </article>
                      </div>
                      {sunnah.sources.length > 0 && (
                        <aside className="mt-3 space-y-3">
                          <h3 className={`text-[13px] text-text-dim ${lang === "ur" ? "font-urdu" : ""}`}>{t(SUNNAH_BOOK.en, SUNNAH_BOOK.ur)}</h3>
                          {sunnah.sources.map((source, sourceIndex) => {
                            const section = getSectionTitle(source.section);
                            const duplicate = isPassageAlreadyInAnswer(sunnah.answer, source.snippet);
                            if (duplicate && !section) return null;
                            return (
                              <article key={`${source.section ?? "source"}-${sourceIndex}`} className="rounded-[var(--radius-source)] border border-line bg-surface p-4">
                                {section && <h4 dir="auto" className={`text-[14px] leading-[2] text-gold ${lang === "ur" ? "font-urdu" : ""}`}>{section}</h4>}
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
                </div>
              )}
            </div>
          </article>
          );
        })}
      </section>
    </main>
  );
}
