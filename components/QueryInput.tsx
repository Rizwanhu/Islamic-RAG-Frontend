import { useRef } from "react";
import { useLang } from "@/lib/lang";
import { LanguageToggle } from "./LanguageToggle";

const EXAMPLES: Record<"en" | "ur", string[]> = {
  en: [
    "Is bank interest permissible?",
    "How is zakat calculated on gold?",
    "When may a traveller shorten prayer?",
  ],
  ur: [
    "بینک کے سود اور منافع کا شرعی حکم کیا ہے",
    "سونے پر زکوٰۃ کس طرح واجب ہوتی ہے",
    "سفر میں نمازِ قصر کب پڑھی جائے گی",
  ],
};

export function QueryInput({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
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
          {t("Your fiqh question", "آپ کا فقہی سوال")}
        </label>
        <LanguageToggle />
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
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && value.trim() && !busy) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={t(
          "Ask about a ruling — the answer will come only from the fatawa corpus.",
          "کوئی مسئلہ پوچھیے — جواب صرف فتاویٰ کے ذخیرے سے دیا جائے گا۔",
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
