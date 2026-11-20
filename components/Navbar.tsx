"use client";

import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";
import { useLang } from "@/lib/lang";

export function Navbar() {
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
      <div className="mx-auto flex max-w-[1120px] flex-col gap-2 px-5 py-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
        <div className="flex items-center justify-between sm:block">
          <Link href="/" className="flex items-center gap-3 text-gold">
            <span aria-hidden="true" className="text-[24px]">✦</span>
            <span className="font-display text-[19px] tracking-[-0.01em] text-text">Sanad</span>
          </Link>
          <div className="sm:hidden">
            <LanguageToggle />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-5">
          <ul className="flex w-full items-center justify-around whitespace-nowrap text-[13px] sm:w-auto sm:shrink-0 sm:justify-start sm:gap-4">
            <li>
              <Link href="/fatwas" className="link-quiet whitespace-nowrap">
                {t("Fatwa", "فتاویٰ")}
              </Link>
            </li>
            <li>
              <Link href="/sunnahs" className="link-quiet whitespace-nowrap">
                {t("Sunnah", "سنتیں")}
              </Link>
            </li>
            <li>
              <Link href="/compare" className="link-quiet whitespace-nowrap">
                {t("Compare", "موازنہ")}
              </Link>
            </li>
          </ul>
          <ul className="hidden items-center gap-5 whitespace-nowrap text-[14px] xl:flex">
            {links.map((l) => (
              <li key={l.to}>
                <Link href={l.to} className="link-quiet whitespace-nowrap">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
