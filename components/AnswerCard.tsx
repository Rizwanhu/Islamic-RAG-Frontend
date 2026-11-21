"use client";

import { useState } from "react";
import { segmentAnswer } from "@/lib/api";
import type { Citation } from "@/lib/types";
import { isRtlText, useLang } from "@/lib/lang";
import { CitationMarker } from "./CitationMarker";
import { BoldText } from "./BoldText";

export function AnswerCard({
  answer,
  citations,
  activeCitation,
  onActivate,
  streaming = false,
  idPrefix,
  englishTranslation,
}: {
  answer: string;
  citations: Citation[];
  activeCitation: number | null;
  onActivate: (n: number) => void;
  streaming?: boolean;
  idPrefix?: string;
  englishTranslation?: string;
}) {
  const { t } = useLang();
  const [showTranslation, setShowTranslation] = useState(false);
  const rtl = isRtlText(answer);
  const segments = segmentAnswer(answer);

  return (
    <article className="panel p-6 sm:p-8" aria-busy={streaming}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[26px] text-text">{t("Answer", "جواب")}</h2>
        {englishTranslation && (
          <button
            type="button"
            aria-expanded={showTranslation}
            onClick={() => setShowTranslation((visible) => !visible)}
            className="rounded-[var(--radius-chip)] border border-line px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:border-gold/40 hover:text-text"
          >
            {showTranslation
              ? t("Hide English", "انگریزی چھپائیں")
              : t("Translate to English", "انگریزی میں ترجمہ")}
          </button>
        )}
      </div>
      <hr className="rule my-5" />

      {/* Concise Direct Answer */}
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={`whitespace-pre-wrap text-[16px] text-text ${rtl ? "font-urdu" : "leading-[1.75]"}`}
      >
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <BoldText key={i}>{seg.value}</BoldText>
          ) : (
            <CitationMarker
              key={i}
              n={seg.n}
              sourceTitle={citations.find((c) => c.n === seg.n)?.source ?? `#${seg.n}`}
              active={activeCitation === seg.n}
              onActivate={onActivate}
              idPrefix={idPrefix}
            />
          ),
        )}
        {streaming && (
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] bg-gold"
          />
        )}
      </div>

      {showTranslation && englishTranslation && (
        <div className="mt-5 border-t border-line pt-5" dir="ltr">
          <p className="text-[12px] font-semibold uppercase tracking-[.12em] text-gold">
            {t("English translation", "انگریزی ترجمہ")}
          </p>
          <div className="mt-3 whitespace-pre-wrap text-[16px] leading-[1.75] text-text">
            {segmentAnswer(englishTranslation).map((seg, i) =>
              seg.kind === "text" ? (
                <BoldText key={i}>{seg.value}</BoldText>
              ) : (
                <CitationMarker
                  key={i}
                  n={seg.n}
                  sourceTitle={citations.find((c) => c.n === seg.n)?.source ?? `#${seg.n}`}
                  active={activeCitation === seg.n}
                  onActivate={onActivate}
                  idPrefix={idPrefix}
                />
              ),
            )}
          </div>
        </div>
      )}

      <hr className="rule my-6" />
      <p className="font-ui text-[13px] italic text-text-dim">
        {t(
          "Compiled from the cited fatawa only. It is not a substitute for a qualified scholar's ruling.",
          "یہ جواب صرف مذکورہ فتاویٰ سے مرتب کیا گیا ہے اور کسی مستند عالم کے فتوے کا بدل نہیں۔",
        )}
      </p>
    </article>
  );
}