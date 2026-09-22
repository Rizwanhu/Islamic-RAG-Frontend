import { Check, Scale } from "lucide-react";
import type { Confidence } from "@/lib/types";
import { useLang } from "@/lib/lang";

/** Confidence tiers live here only. Adding a tier means adding a key to this
 *  map — the result page never branches on confidence itself. */
const TIERS: Record<
  Confidence,
  {
    tone: string;
    icon: typeof Check;
    label: (n: number, t: (e: string, u: string) => string) => string;
  }
> = {
  grounded: {
    tone: "border-sage/45 bg-sage/12 text-sage",
    icon: Check,
    label: (n, t) => t(`Grounded · ${n} sources agree`, `مستند · ${n} مآخذ متفق`),
  },
  review: {
    tone: "border-gold/50 bg-gold/12 text-gold",
    icon: Scale,
    label: (_n, t) => t("Needs scholar review", "عالم کی رہنمائی درکار"),
  },
};

export function VerificationBadge({
  confidence,
  sourceCount,
}: {
  confidence: Confidence;
  sourceCount: number;
}) {
  const { t } = useLang();
  const tier = TIERS[confidence] ?? TIERS.review;
  const Icon = tier.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[var(--radius-chip)] border px-3 py-1.5 text-[13px] ${tier.tone}`}
    >
      <Icon size={14} aria-hidden="true" />
      {tier.label(sourceCount, t)}
    </span>
  );
}
