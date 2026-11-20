import { useRef } from "react";
import { useLang } from "@/lib/lang";
import { LanguageToggle } from "./LanguageToggle";

const EXAMPLES: Record<"en" | "ur", string[]> = {
  en: [
    "What are the Sunnahs of eating and drinking?",
    "What should I recite before going to sleep?",
    "Is bank interest permissible?",
  ],
  ur: [
    "کھانے پینے کی مسنون آداب کیا ہیں؟",
    "سونے سے پہلے کون سی دعائیں پڑھنی چاہییں؟",
    "بینک کے سود اور منافع کا شرعی حکم کیا ہے",
  ],
};

export type QuestionCategory = "all" | "sunnah" | "fatwa";

export function QueryInput({
  value,
  onChange,
  onSubmit,
  busy,
  category,
  onCategoryChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  category: QuestionCategory;
  onCategoryChange: (category: QuestionCategory) => void;
}) {
  const { lang, locale, t } = useLang();
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      className="panel p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !busy) onSubmit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="sanad-query" className="text-[13px] text-text-muted">
          {t("Your question", "آپ کا سوال")}
        </label>
        <LanguageToggle />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="question-category" className="text-[13px] text-text-muted">
          {t("Search in", "تلاش کریں")}
        </label>
        <select
          id="question-category"
          value={category}
          onChange={(e) => {
            const selected = e.currentTarget.value;
            if (selected === "all" || selected === "sunnah" || selected === "fatwa") {
              onCategoryChange(selected);
            }
          }}
          className="recessed px-3 py-2 text-[13px] text-text outline-none focus:border-gold/60"
        >
          <option value="all">{t("All sources (default)", "تمام مآخذ (طے شدہ)")}</option>
          <option value="sunnah">{t("Sunnah", "سنت")}</option>
          <option value="fatwa">{t("Fatwa", "فتویٰ")}</option>
        </select>
      </div>

      <textarea
        id="sanad-query"
        ref={ref}
        dir={locale.dir}
        lang={locale.code}
        rows={lang === "ur" ? 3 : 4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && value.trim() && !busy) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={t(
          "Ask anything about Sunnah or fiqh.",
          "سنت یا فقہ کے بارے میں کوئی بھی سوال پوچھیے۔",
        )}
        className={[
          "recessed mt-4 w-full resize-y p-4 text-text outline-none",
          lang === "ur" ? "font-urdu text-[17px] leading-[2.3]" : "text-[15px]",
        ].join(" ")}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-text-dim">{t("Try", "مثالیں")}</span>
        {EXAMPLES[lang].map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              onChange(ex);
              ref.current?.focus();
            }}
            dir={lang === "ur" ? "rtl" : "ltr"}
            className={[
              "rounded-[var(--radius-chip)] border border-line bg-ink-2 px-3 py-1.5 text-text-muted transition-colors hover:border-gold/40 hover:text-text",
              lang === "ur" ? "font-urdu text-[13px] leading-[2]" : "text-[13px]",
            ].join(" ")}
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-text-dim">
          {t("Sources are shown with every answer.", "ہر جواب کے ساتھ مآخذ دکھائے جاتے ہیں۔")}
        </p>
        <button
          type="submit"
          disabled={!value.trim() || busy}
          className="rounded-[var(--radius-chip)] bg-gold px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--gold)_88%,white)] disabled:cursor-not-allowed disabled:bg-line disabled:text-text-dim"
        >
          {busy ? t("Verifying", "تصدیق جاری ہے") : t("Ask & Verify", "پوچھیں اور تصدیق کریں")}
        </button>
      </div>
    </form>
  );
}
