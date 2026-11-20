"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Search, SearchX, X } from "lucide-react";
import type { Obloga } from "@/lib/data/obloge";
import { brojSImenicom, OBLIK_OBLOGA } from "@/lib/format";
import { normalizirajZaPretragu } from "@/lib/obloge";
import { zapamtiPovratak } from "@/lib/povratak";
import { Cip, CipTraka } from "@/components/ui/Cip";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { PraznoStanje } from "@/components/ui/PraznoStanje";
import { OblogaKartica } from "./OblogaKartica";

/** Filter kategorije: "" = sve aktivne, "arhiva" = arhivirane, inače id kategorije. */
type Filter = string;

type Props = {
  obloge: Obloga[];
  kategorije: { id: number; naziv: string }[];
  pocetno: { k: Filter; q: string };
};

const PUTANJA = "/obloge";

/**
 * Mreža obloga (2 u redu na mobitelu) s čipovima kategorija i pretragom.
 * Filtrira se u pregledniku (obloga je malo); odabir se upisuje u URL (?k=&q=), pa ga
 * gumb Natrag preglednika i „Natrag" u zaglavlju vraćaju.
 */
export function ListaObloga({ obloge, kategorije, pocetno }: Props) {
  const [k, setK] = useState<Filter>(pocetno.k);
  const [q, setQ] = useState(pocetno.q);

  function promijeni(noviK: Filter, noviQ: string) {
    setK(noviK);
    setQ(noviQ);
    const params = new URLSearchParams();
    if (noviK) params.set("k", noviK);
    if (noviQ.trim()) params.set("q", noviQ);
    const url = params.size ? `${PUTANJA}?${params}` : PUTANJA;
    window.history.replaceState(null, "", url);
    zapamtiPovratak(PUTANJA, url);
  }

  const imaArhiviranih = obloge.some((o) => !o.aktivan);
  const imaAktivnih = obloge.some((o) => o.aktivan);

  const prikaz = useMemo(() => {
    const trazi = normalizirajZaPretragu(q);
    return obloge.filter((o) => {
      if (k === "arhiva" ? o.aktivan : !o.aktivan) return false;
      if (k && k !== "arhiva" && String(o.kategorija_id) !== k) return false;
      return !trazi || normalizirajZaPretragu(o.naziv).includes(trazi);
    });
  }, [obloge, k, q]);

  if (!imaAktivnih && !imaArhiviranih) {
    return (
      <PraznoStanje
        ikona={LayoutGrid}
        naslov="Još nema obloga"
        opis="Dodajte prvu oblogu sa slikom, cijenom i stanjem."
        akcija={<GumbPoveznica href="/obloge/nova">Dodaj prvu oblogu</GumbPoveznica>}
      />
    );
  }

  const nazivFiltera =
    k === "arhiva" ? "arhivi" : k ? `kategoriji „${kategorije.find((x) => String(x.id) === k)?.naziv ?? ""}”` : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative" role="search">
        <label htmlFor="pretraga-obloga" className="sr-only">
          Traži oblogu
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sivosmeda"
        />
        <input
          id="pretraga-obloga"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => promijeni(k, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur(); // zatvori tipkovnicu na mobitelu
          }}
          placeholder="Traži oblogu…"
          className="h-12 w-full rounded-[var(--radius-polje)] border border-rub bg-povrsina pr-12 pl-12 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => promijeni(k, "")}
            aria-label="Očisti pretragu"
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-polje)] text-sivosmeda hover:text-espresso"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <CipTraka oznaka="Kategorije">
        <Cip odabran={k === ""} onClick={() => promijeni("", q)}>
          Sve
        </Cip>
        {kategorije.map((kat) => (
          <Cip key={kat.id} odabran={k === String(kat.id)} onClick={() => promijeni(String(kat.id), q)}>
            {kat.naziv}
          </Cip>
        ))}
        {(imaArhiviranih || k === "arhiva") && (
          <Cip odabran={k === "arhiva"} onClick={() => promijeni("arhiva", q)}>
            Arhivirane
          </Cip>
        )}
      </CipTraka>

      {prikaz.length === 0 ? (
        <PraznoStanje
          ikona={SearchX}
          naslov="Nema rezultata"
          opis={
            q.trim()
              ? `Nijedna obloga${nazivFiltera ? ` u ${nazivFiltera}` : ""} ne sadrži „${q.trim()}”.`
              : k === "arhiva"
                ? "Nema arhiviranih obloga."
                : "U ovoj kategoriji još nema obloga."
          }
          akcija={
            q.trim() || k ? (
              <button
                type="button"
                onClick={() => promijeni("", "")}
                className="min-h-12 font-semibold text-espresso underline underline-offset-4"
              >
                Prikaži sve obloge
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-sivosmeda tabular-nums" aria-live="polite">
            {brojSImenicom(prikaz.length, OBLIK_OBLOGA)}
            {k === "arhiva" && " u arhivi"}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {prikaz.map((o, i) => (
              <li key={o.id} className="flex">
                <OblogaKartica obloga={o} prioritet={i < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
