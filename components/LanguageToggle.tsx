"use client";

import { LOCALES, useLang } from "@/lib/lang";

export function LanguageToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const { lang, setLang, t } = useLang();
  const pad = size === "md" ? "px-4 py-2 text-[14px]" : "px-3 py-1.5 text-[13px]";

  return (
    <div
      role="radiogroup"
      aria-label={t("Question language", "سوال کی زبان")}
      className="flex items-center gap-1 rounded-[var(--radius-chip)] border border-line bg-ink-2 p-1"
    >
      {LOCALES.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l.code}
            onClick={() => setLang(l.code)}
            className={[
              pad,
              "rounded-[6px] transition-colors",
              l.code === "ur" ? "font-urdu leading-[2]" : "",
              active
                ? "bg-surface-2 text-text"
                : "text-text-muted hover:bg-surface hover:text-text",
            ].join(" ")}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
