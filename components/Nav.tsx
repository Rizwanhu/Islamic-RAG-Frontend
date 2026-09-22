"use client";

import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";
import { useLang } from "@/lib/lang";

export function Nav() {
  const { t } = useLang();

  const links: { to: string; label: string }[] = [
    { to: "/about", label: t("How it works", "طریقۂ کار") },
    { to: "/sources", label: t("Sources", "مآخذ") },
    { to: "/history", label: t("History", "سابقہ سوالات") },
  ];

  return (
    <nav
      aria-label={t("Primary", "بنیادی")}
      className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-3 text-gold">
          <span aria-hidden="true" className="text-[24px]">✦</span>
          <span className="font-display text-[19px] tracking-[-0.01em] text-text">Sanad</span>
        </Link>

        <div className="flex items-center gap-5">
          <ul className="hidden items-center gap-5 text-[14px] sm:flex">
            {links.map((l) => (
              <li key={l.to}>
                <Link href={l.to} className="link-quiet">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageToggle />
        </div>
      </div>
    </nav>
  );
}
