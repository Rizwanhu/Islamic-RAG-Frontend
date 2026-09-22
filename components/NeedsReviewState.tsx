import { Scale } from "lucide-react";
import { useLang } from "@/lib/lang";

export type ReviewReason = "no-sources" | "weak-match" | "disagreement";

export function NeedsReviewState({
  reason,
  sourceCount,
}: {
  reason: ReviewReason;
  sourceCount: number;
}) {
  const { t } = useLang();

  const explanation: Record<ReviewReason, string> = {
    "no-sources": t(
      "No fatwa in this corpus covers your question closely enough to answer from. Nothing was generated, because an answer without a source would be a guess.",
      "اس سوال سے قریب کوئی فتویٰ اس ذخیرے میں نہیں ملا۔ بغیر ماخذ کے جواب اندازہ ہوتا، اس لیے کوئی جواب مرتب نہیں کیا گیا۔",
    ),
    "weak-match": t(
      "The retrieved passages only partially match your question. Read them yourself and take the matter to a scholar.",
      "دستیاب اقتباسات آپ کے سوال سے جزوی مطابقت رکھتے ہیں۔ انہیں خود پڑھیں اور مسئلہ کسی عالم کے سامنے رکھیں۔",
    ),
    disagreement: t(
      "The retrieved sources do not agree with each other, so no single answer was synthesised. The passages are shown below unchanged.",
      "دستیاب مآخذ آپس میں متفق نہیں، اس لیے کوئی واحد جواب مرتب نہیں کیا گیا۔ اقتباسات بغیر تبدیلی کے نیچے موجود ہیں۔",
    ),
  };

  const steps = [
    t("Read the retrieved passages below in full.", "نیچے دیے گئے اقتباسات مکمل پڑھیں۔"),
    t("Open the original fatwa on the Binoria site.", "اصل فتویٰ بنوریہ کی ویب سائٹ پر کھولیں۔"),
    t("Put the question to a qualified mufti.", "سوال کسی مستند مفتی کے سامنے رکھیں۔"),
  ];

  return (
    <section
      aria-labelledby="review-heading"
      className="rounded-[var(--radius-panel)] border border-dashed border-gold/55 bg-ink-2 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 text-gold">
        <Scale size={18} aria-hidden="true" />
        <h2 id="review-heading" className="font-display text-[24px] text-text">
          {t("No answer given", "جواب مرتب نہیں کیا گیا")}
        </h2>
      </div>

      <p className="mt-4 max-w-[60ch] text-[15px] text-text-muted">{explanation[reason]}</p>

      <hr className="rule my-6" />

      <p className="text-[13px] text-text-dim">{t("What to do next", "اب کیا کریں")}</p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-[14px] text-text-muted">
            <span className="mt-[3px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-line text-[11px] text-text-dim">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {sourceCount > 0 && (
        <p className="mt-6 text-[13px] text-text-dim">
          {t(
            `${sourceCount} retrieved passages are listed alongside this notice.`,
            `${sourceCount} اقتباسات اس اطلاع کے ساتھ درج ہیں۔`,
          )}
        </p>
      )}
    </section>
  );
}
