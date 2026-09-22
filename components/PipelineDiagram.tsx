"use client";

import { useLang } from "@/lib/lang";

const NODES = [
  { key: "query", en: "Query", ur: "سوال" },
  { key: "retrieve", en: "Retrieve", ur: "تلاش" },
  { key: "verify", en: "Verify", ur: "تصدیق" },
  { key: "ground", en: "Ground", ur: "استناد" },
  { key: "cite", en: "Cite", ur: "حوالہ" },
] as const;

export function PipelineDiagram({
  activeKey,
  compact = false,
}: {
  activeKey?: (typeof NODES)[number]["key"];
  compact?: boolean;
}) {
  const { t, lang } = useLang();

  return (
    <div>
      <ol className="relative flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className="absolute inset-x-[8%] top-[15px] h-px bg-line"
          style={{ top: compact ? 13 : 15 }}
        />
        {NODES.map((node) => {
          const isVerify = node.key === "verify";
          const isActive = activeKey === node.key;
          return (
            <li key={node.key} className="relative z-10 flex flex-1 flex-col items-center gap-2">
              <span
                className={[
                  "flex items-center justify-center rounded-full border bg-ink transition-colors duration-200",
                  compact ? "h-[26px] w-[26px]" : "h-[30px] w-[30px]",
                  isActive
                    ? "border-gold text-gold"
                    : isVerify
                      ? "border-sage/70 text-sage"
                      : "border-line text-text-dim",
                ].join(" ")}
              >
                <span
                  className={[
                    "block rounded-full",
                    compact ? "h-[7px] w-[7px]" : "h-[8px] w-[8px]",
                    isActive ? "bg-gold" : isVerify ? "bg-sage" : "bg-line",
                  ].join(" ")}
                />
              </span>
              <span
                className={[
                  "text-center",
                  lang === "ur" ? "font-urdu text-[13px] leading-[2]" : "text-[13px]",
                  isActive ? "text-text" : isVerify ? "text-sage" : "text-text-dim",
                ].join(" ")}
              >
                {t(node.en, node.ur)}
              </span>
            </li>
          );
        })}
      </ol>

      {!compact && (
        <p className="mt-6 max-w-[62ch] text-[14px] text-text-muted">
          {t(
            "Below the confidence threshold at the Verify step, Sanad shows a review-needed notice with the raw passages instead of an answer.",
            "تصدیق کے مرحلے پر مقررہ معیار سے کم اعتماد کی صورت میں سنَد جواب کے بجائے اصل اقتباسات کے ساتھ نظرثانی کی اطلاع دکھاتا ہے۔",
          )}
        </p>
      )}
    </div>
  );
}
