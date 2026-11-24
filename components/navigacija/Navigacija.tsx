"use client";

import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { procitajPovratak } from "@/lib/povratak";
import { STAVKE_NAVIGACIJE, jeAktivna, naslovZaPutanju, roditeljPutanje } from "./stavke";
import { useZadrziIzlazak } from "./ZastitaIzlaska";

/** Znak loga (samo „M", bez natpisa): gornji dio punog loga. */
function ZnakLoga({ sirina = 28 }: { sirina?: number }) {
  return (
    <span className="block overflow-hidden" style={{ width: sirina, height: Math.round(sirina * 0.8) }} aria-hidden>
      <Image src="/slike/logo/logoNoBackground.png" alt="" width={sirina} height={Math.round((sirina * 619) / 600)} />
    </span>
  );
}

/**
 * Uz Cache Components usePathname() suspendira na rutama s nepoznatim dinamičkim parametrom
 * (npr. /obloge/[id]) dok se prerenderira statična ljuska. Zato se putanja čita u malom listu
 * unutar <Suspense>, a fallback je isti prikaz bez putanje (bez aktivne stavke i naslova).
 */
function SPutanjom({ children }: { children: (pathname: string | null) => ReactNode }) {
  return (
    <Suspense fallback={children(null)}>
      <CitajPutanju>{children}</CitajPutanju>
    </Suspense>
  );
}

function CitajPutanju({ children }: { children: (pathname: string) => ReactNode }) {
  return children(usePathname());
}

/** Zaglavlje na mobitelu (56 px): znak (ili „Natrag" na pod-ekranima), naslov ekrana, zupčanik → Postavke. */
export function Zaglavlje() {
  return <SPutanjom>{(pathname) => <SadrzajZaglavlja pathname={pathname} />}</SPutanjom>;
}

function SadrzajZaglavlja({ pathname }: { pathname: string | null }) {
  const naPostavkama = !!pathname?.startsWith("/postavke");
  const natrag = pathname ? roditeljPutanje(pathname) : null;
  const router = useRouter();
  const zadrzi = useZadrziIzlazak();

  return (
    <header className="sticky top-0 z-20 border-b border-rub bg-povrsina pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        {natrag ? (
          <Link
            href={natrag}
            onClick={(e) => {
              // Na listu se vraća s istim filterom (čip, pretraga) koji je bio prije otvaranja.
              const spremljeno = procitajPovratak(natrag);
              if (spremljeno) {
                e.preventDefault();
                if (!zadrzi(spremljeno)) router.push(spremljeno);
              }
            }}
            onNavigate={(e) => {
              if (zadrzi(natrag)) e.preventDefault();
            }}
            aria-label="Natrag"
            className="-ml-3 flex size-12 items-center justify-center rounded-full text-espresso hover:bg-rub/50"
          >
            <ArrowLeft aria-hidden className="size-6" />
          </Link>
        ) : (
          <Link
            href="/"
            aria-label="Početna"
            onNavigate={(e) => {
              if (zadrzi("/")) e.preventDefault();
            }}
          >
            <ZnakLoga />
          </Link>
        )}
        <h1 className="flex-1 truncate font-naslov text-lg font-semibold text-espresso">
          {pathname ? naslovZaPutanju(pathname) : ""}
        </h1>
        <Link
          href="/postavke"
          aria-label="Postavke"
          onNavigate={(e) => {
            if (zadrzi("/postavke")) e.preventDefault();
          }}
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
  const zadrzi = useZadrziIzlazak();

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rub bg-povrsina pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <SPutanjom>
        {(pathname) => (
          <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
            {STAVKE_NAVIGACIJE.map(({ href, naziv, ikona: Ikona }) => {
              const aktivna = pathname !== null && jeAktivna(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={aktivna ? "page" : undefined}
                    onNavigate={(e) => {
                      if (zadrzi(href)) e.preventDefault();
                    }}
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
        )}
      </SPutanjom>
    </nav>
  );
}

/** Bočna traka na računalu (≥ 1024 px). */
export function BocnaTraka() {
  const stavke = [...STAVKE_NAVIGACIJE, { href: "/postavke", naziv: "Postavke", ikona: Settings }];
  const zadrzi = useZadrziIzlazak();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rub bg-povrsina lg:flex">
      <div className="traka-brenda" aria-hidden />
      <Link
        href="/"
        className="flex items-center gap-3 px-5 py-5"
        aria-label="Početna"
        onNavigate={(e) => {
          if (zadrzi("/")) e.preventDefault();
        }}
      >
        <ZnakLoga sirina={36} />
        <span className="font-naslov text-lg font-semibold text-espresso">obloga.ba</span>
      </Link>
      <nav aria-label="Glavna navigacija" className="flex-1 px-3">
        <SPutanjom>
          {(pathname) => (
            <ul className="flex flex-col gap-1">
              {stavke.map(({ href, naziv, ikona: Ikona }) => {
                const aktivna = pathname !== null && jeAktivna(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={aktivna ? "page" : undefined}
                      onNavigate={(e) => {
                        if (zadrzi(href)) e.preventDefault();
                      }}
                      className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-polje)] px-3 font-semibold ${
                        aktivna
                          ? "bg-pijesak-svijetli text-espresso"
                          : "text-sivosmeda hover:bg-pozadina hover:text-espresso"
                      }`}
                    >
                      <Ikona aria-hidden className={`size-5 ${aktivna ? "text-espresso" : ""}`} />
                      {naziv}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SPutanjom>
      </nav>
    </aside>
  );
}
