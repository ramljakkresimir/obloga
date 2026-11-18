"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { STAVKE_NAVIGACIJE, jeAktivna, naslovZaPutanju } from "./stavke";

/** Znak loga (samo „M", bez natpisa): gornji dio punog loga. */
function ZnakLoga({ sirina = 28 }: { sirina?: number }) {
  return (
    <span className="block overflow-hidden" style={{ width: sirina, height: Math.round(sirina * 0.8) }} aria-hidden>
      <Image src="/slike/logo/logoNoBackground.png" alt="" width={sirina} height={Math.round((sirina * 619) / 600)} />
    </span>
  );
}

/** Zaglavlje na mobitelu (56 px): znak, naslov ekrana, zupčanik → Postavke. */
export function Zaglavlje() {
  const pathname = usePathname();
  const naPostavkama = pathname.startsWith("/postavke");

  return (
    <header className="sticky top-0 z-20 border-b border-rub bg-povrsina pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" aria-label="Početna">
          <ZnakLoga />
        </Link>
        <h1 className="flex-1 truncate font-naslov text-lg font-semibold text-espresso">{naslovZaPutanju(pathname)}</h1>
        <Link
          href="/postavke"
          aria-label="Postavke"
          aria-current={naPostavkama ? "page" : undefined}
          className={`-mr-2 flex size-12 items-center justify-center rounded-full ${
            naPostavkama ? "text-espresso" : "text-sivosmeda hover:text-espresso"
          }`}
        >
          <Settings aria-hidden className="size-6" />
        </Link>
      </div>
    </header>
  );
}

/** Donja navigacija na mobitelu (64 px + sigurna zona). */
export function DonjaNavigacija() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rub bg-povrsina pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {STAVKE_NAVIGACIJE.map(({ href, naziv, ikona: Ikona }) => {
          const aktivna = jeAktivna(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={aktivna ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  aktivna ? "text-espresso" : "text-sivosmeda"
                }`}
              >
                <span
                  className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    aktivna ? "bg-narancasta" : ""
                  }`}
                >
                  <Ikona aria-hidden className="size-5" strokeWidth={2} />
                </span>
                {naziv}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bočna traka na računalu (≥ 1024 px). */
export function BocnaTraka() {
  const pathname = usePathname();
  const stavke = [...STAVKE_NAVIGACIJE, { href: "/postavke", naziv: "Postavke", ikona: Settings }];

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rub bg-povrsina lg:flex">
      <div className="traka-brenda" aria-hidden />
      <Link href="/" className="flex items-center gap-3 px-5 py-5" aria-label="Početna">
        <ZnakLoga sirina={36} />
        <span className="font-naslov text-lg font-semibold text-espresso">obloga.ba</span>
      </Link>
      <nav aria-label="Glavna navigacija" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {stavke.map(({ href, naziv, ikona: Ikona }) => {
            const aktivna = jeAktivna(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={aktivna ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-polje)] px-3 font-semibold ${
                    aktivna ? "bg-pijesak-svijetli text-espresso" : "text-sivosmeda hover:bg-pozadina hover:text-espresso"
                  }`}
                >
                  <Ikona aria-hidden className={`size-5 ${aktivna ? "text-espresso" : ""}`} />
                  {naziv}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
