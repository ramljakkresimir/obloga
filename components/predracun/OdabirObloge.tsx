"use client";

import { useMemo, useState } from "react";
import { Check, Search, SearchX, X } from "lucide-react";
import { formatKM } from "@/lib/format";
import { normalizirajZaPretragu } from "@/lib/obloge";
import { SlikaObloge } from "@/components/obloge/SlikaObloge";
import { Cip, CipTraka } from "@/components/ui/Cip";
import { DonjiList } from "@/components/ui/DonjiList";

export type OblogaOdabira = {
  id: number;
  naziv: string;
  slika: string | null;
  kategorija_id: number;
  cijena_kom: number;
  m2_po_komadu: number | null;
  stanje: number;
};

type Props = {
  otvoren: boolean;
  onZatvori: () => void;
  /** Samo aktivne obloge, poredane kao na listi obloga. */
  obloge: OblogaOdabira[];
  kategorije: { id: number; naziv: string }[];
  /** Obloge koje su već u predračunu. */
  dodane: Set<number>;
  onOdaberi: (obloga: OblogaOdabira) => void;
};

/**
 * Donji list s mrežom obloga (2 u redu), pretragom i čipovima kategorija.
 * Dodir na oblogu je dodaje u predračun; već dodana obloga je označena, a dodir vodi na njenu stavku.
 */
export function OdabirObloge({ otvoren, onZatvori, obloge, kategorije, dodane, onOdaberi }: Props) {
  const [k, setK] = useState("");
  const [q, setQ] = useState("");

  const prikaz = useMemo(() => {
    const trazi = normalizirajZaPretragu(q);
    return obloge.filter(
      (o) => (!k || String(o.kategorija_id) === k) && (!trazi || normalizirajZaPretragu(o.naziv).includes(trazi)),
    );
  }, [obloge, k, q]);

  return (
    <DonjiList otvoren={otvoren} onZatvori={onZatvori} naslov="Dodaj oblogu">
      <div className="flex min-h-[70dvh] flex-col gap-3">
        <div className="relative" role="search">
          <label htmlFor="pretraga-odabira" className="sr-only">
            Traži oblogu
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sivosmeda"
          />
          <input
            id="pretraga-odabira"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur(); // zatvori tipkovnicu na mobitelu
            }}
            placeholder="Traži oblogu…"
            className="h-12 w-full rounded-[var(--radius-polje)] border border-rub bg-povrsina pr-12 pl-12 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Očisti pretragu"
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-polje)] text-sivosmeda hover:text-espresso"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>

        {kategorije.length > 1 && (
          <CipTraka oznaka="Kategorije">
            <Cip odabran={k === ""} onClick={() => setK("")}>
              Sve
            </Cip>
            {kategorije.map((kat) => (
              <Cip key={kat.id} odabran={k === String(kat.id)} onClick={() => setK(String(kat.id))}>
                {kat.naziv}
              </Cip>
            ))}
          </CipTraka>
        )}

        {prikaz.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sivosmeda">
            <SearchX aria-hidden className="size-8 text-drvo" />
            <p>
              {obloge.length === 0
                ? "Nema aktivnih obloga. Prvo dodajte obloge."
                : q.trim()
                  ? `Nijedna obloga ne sadrži „${q.trim()}”.`
                  : "U ovoj kategoriji nema obloga."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {prikaz.map((o) => {
              const dodana = dodane.has(o.id);
              return (
                <li key={o.id} className="flex">
                  <button
                    type="button"
                    onClick={() => onOdaberi(o)}
                    aria-label={dodana ? `${o.naziv} (već dodano)` : `Dodaj ${o.naziv}`}
                    className={`flex w-full flex-col overflow-hidden rounded-[var(--radius-kartica)] border bg-povrsina text-left shadow-[var(--shadow-kartica)] transition-shadow focus-visible:ring-2 focus-visible:ring-narancasta focus-visible:outline-none ${
                      dodana ? "border-espresso ring-1 ring-espresso" : "border-rub hover:shadow-md"
                    }`}
                  >
                    <div className="relative aspect-[4/3] w-full">
                      <SlikaObloge slika={o.slika} naziv={o.naziv} sizes="(min-width: 1024px) 240px, 50vw" />
                      {dodana && (
                        <span className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-full bg-espresso px-2.5 text-[13px] leading-[18px] font-semibold text-white shadow-sm">
                          <Check aria-hidden className="size-3.5" />
                          Već dodano
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <span className="line-clamp-2 leading-snug font-semibold text-tekst">{o.naziv}</span>
                      <span className="mt-auto text-sm text-sivosmeda tabular-nums">
                        <span className="font-semibold text-espresso">{formatKM(o.cijena_kom)}</span>/kom
                        {" · "}
                        <span className={o.stanje < 0 ? "text-greska" : ""}>
                          {o.stanje < 0 ? "−" : ""}
                          {Math.abs(o.stanje)} kom
                        </span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DonjiList>
  );
}
