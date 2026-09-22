"use client";

import { ExternalLink } from "lucide-react";
import type { Citation } from "@/lib/types";
import { isRtlText, useLang } from "@/lib/lang";

/** One card, used identically on /result and /sources. */
export function SourceCard({
  citation,
  active = false,
  onActivate,
  showMatch = true,
  sample = false,
}: {
  citation: Citation;
  active?: boolean;
  onActivate?: (n: number) => void;
  showMatch?: boolean;
  sample?: boolean;
}) {
  const { t } = useLang();
  const rtl = isRtlText(citation.excerpt);
  const pct = Math.round(citation.matchScore * 100);
  const interactive = Boolean(onActivate);

  return (
    <article
      id={`source-${citation.n}`}
      aria-labelledby={`source-title-${citation.n}`}
      tabIndex={interactive ? 0 : undefined}
      onMouseEnter={() => onActivate?.(citation.n)}
      onFocus={() => onActivate?.(citation.n)}
      onClick={() => onActivate?.(citation.n)}
      className={[
        "rounded-[var(--radius-source)] border border-line bg-surface p-5 transition-colors duration-150",
        interactive ? "cursor-pointer hover:bg-surface-2" : "",
        active ? "cite-active" : "",
      ].join(" ")}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-[2px] inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-gold/45 bg-gold/12 px-1.5 text-[12px] text-gold"
        >
          {citation.n}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={`source-title-${citation.n}`}
            className="font-display text-[16px] leading-snug text-text"
          >
            {citation.source}
          </h3>
          {(citation.category || citation.subCategory) && (
            <p className="mt-1 font-urdu text-[13px] leading-[2] text-text-dim" dir="rtl">
              {[citation.category, citation.subCategory].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        {sample && (
          <span className="shrink-0 rounded-[var(--radius-chip)] border border-line px-2 py-0.5 text-[11px] text-text-dim">
            {t("Sample entry", "نمونہ اندراج")}
          </span>
        )}
      </header>

      <p
        dir={rtl ? "rtl" : "ltr"}
        className={`mt-3 text-[14px] text-text-muted ${rtl ? "font-urdu" : ""}`}
      >
        {citation.excerpt}
      </p>

      {showMatch && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[12px] text-text-dim">
            <span>{t("Passage match", "مماثلت")}</span>
            <span className="text-text-muted">{pct}%</span>
          </div>
          <div
            role="meter"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("Passage match score", "مماثلت کا تناسب")}
            className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ink-2"
          >
            <div className="h-full bg-gold/70" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="link-quiet mt-4 inline-flex items-center gap-1.5 text-[13px]"
        >
          {t("Read the full fatwa", "مکمل فتویٰ پڑھیں")}
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
