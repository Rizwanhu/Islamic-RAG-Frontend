import { useLang } from "@/lib/lang";

export function CitationMarker({
  n,
  sourceTitle,
  active,
  onActivate,
}: {
  n: number;
  sourceTitle: string;
  active: boolean;
  onActivate: (n: number) => void;
}) {
  const { t } = useLang();

  return (
    <button
      type="button"
      id={`cite-${n}`}
      aria-pressed={active}
      aria-controls={`source-${n}`}
      aria-label={t(
        `Citation ${n}: highlight source ${sourceTitle}`,
        `حوالہ ${n}: ماخذ ${sourceTitle} نمایاں کریں`,
      )}
      onClick={() => onActivate(n)}
      onMouseEnter={() => onActivate(n)}
      onFocus={() => onActivate(n)}
      className={[
        "mx-[3px] inline-flex h-[18px] min-w-[18px] translate-y-[-5px] items-center justify-center",
        "rounded-full border px-[5px] align-baseline font-ui text-[11px] leading-none transition-colors duration-150",
        active
          ? "border-gold bg-gold text-ink"
          : "border-gold/45 bg-gold/12 text-gold hover:bg-gold/25",
      ].join(" ")}
    >
      {n}
    </button>
  );
}
