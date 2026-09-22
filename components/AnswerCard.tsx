import { segmentAnswer } from "@/lib/api";
import type { Citation } from "@/lib/types";
import { isRtlText, useLang } from "@/lib/lang";
import { CitationMarker } from "./CitationMarker";

export function AnswerCard({
  answer,
  citations,
  activeCitation,
  onActivate,
  streaming = false,
}: {
  answer: string;
  citations: Citation[];
  activeCitation: number | null;
  onActivate: (n: number) => void;
  streaming?: boolean;
}) {
  const { t } = useLang();
  const rtl = isRtlText(answer);
  const segments = segmentAnswer(answer);

  return (
    <article className="panel p-6 sm:p-8" aria-busy={streaming}>
      <h2 className="font-display text-[26px] text-text">{t("Answer", "جواب")}</h2>
      <hr className="rule my-5" />

      <div
        dir={rtl ? "rtl" : "ltr"}
        className={`whitespace-pre-wrap text-[16px] text-text ${rtl ? "font-urdu" : "leading-[1.75]"}`}
      >
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <CitationMarker
              key={i}
              n={seg.n}
              sourceTitle={citations.find((c) => c.n === seg.n)?.source ?? `#${seg.n}`}
              active={activeCitation === seg.n}
              onActivate={onActivate}
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
