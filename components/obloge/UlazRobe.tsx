"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, Search, SearchX, X } from "lucide-react";
import { spremiUlaz } from "@/app/(app)/obloge/actions";
import { brojSImenicom, formatBroj, OBLIK_OBLOGA, parseBroj } from "@/lib/format";
import { normalizirajZaPretragu } from "@/lib/obloge";
import { useZadrziIzlazak, useZastitaIzlaska } from "@/components/navigacija/ZastitaIzlaska";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Cip, CipTraka } from "@/components/ui/Cip";
import { Gumb } from "@/components/ui/Gumb";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";
import { PraznoStanje } from "@/components/ui/PraznoStanje";
import { SlikaObloge } from "./SlikaObloge";

type OblogaUlaza = { id: number; naziv: string; slika: string | null; kategorija_id: number; stanje: number };

type Props = {
  obloge: OblogaUlaza[];
  kategorije: { id: number; naziv: string }[];
};

/** Filter: "" = sve, "upisano" = obloge s upisanom količinom, inače id kategorije. */
type Filter = string;

const NAJVISE = 1_000_000;

/** Tekst polja → količina. Prazno = 0; neispravno (decimale, negativno, preveliko) = null. */
function kolicinaIzTeksta(tekst: string): number | null {
  if (tekst.trim() === "") return 0;
  const n = parseBroj(tekst);
  if (n === null || !Number.isInteger(n) || n < 0 || n > NAJVISE) return null;
  return n;
}

/**
 * Skupni ulaz robe: lista svih aktivnih obloga s poljem za količinu (prazno = 0).
 * Količine se drže po id-u obloge, pa ih filter i pretraga ne brišu.
 * Spremanje bez potvrde; greške se ispravljaju s „Poništi" u povijesti obloge.
 */
export function UlazRobe({ obloge, kategorije }: Props) {
  const [kolicine, setKolicine] = useState<Record<number, string>>({});
  const [napomena, setNapomena] = useState("");
  const [k, setK] = useState<Filter>("");
  // Kod filtera „Upisano" popis se zapamti pri odabiru, da redak ne nestane dok se količina briše/mijenja.
  const [upisaniPriOdabiru, setUpisaniPriOdabiru] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [greska, setGreska] = useState<string | null>(null);
  const [sprema, startSpremanja] = useTransition();
  const zadrzi = useZadrziIzlazak();

  const { stavke, ukupno, upisani } = useMemo(() => {
    const stavke: { artikl_id: number; kolicina: number }[] = [];
    /** Obloge s količinom > 0 ili neispravnim unosom. */
    const upisani = new Set<number>();
    let ukupno = 0;
    for (const o of obloge) {
      const n = kolicinaIzTeksta(kolicine[o.id] ?? "");
      if (n !== 0) upisani.add(o.id);
      if (n !== null && n > 0) {
        stavke.push({ artikl_id: o.id, kolicina: n });
        ukupno += n;
      }
    }
    return { stavke, ukupno, upisani };
  }, [obloge, kolicine]);
  const neispravnih = upisani.size - stavke.length;

  useZastitaIzlaska((upisani.size > 0 || napomena.trim() !== "") && !sprema);

  const prikaz = useMemo(() => {
    const trazi = normalizirajZaPretragu(q);
    return obloge.filter((o) => {
      if (k === "upisano" ? !upisaniPriOdabiru.has(o.id) : k && String(o.kategorija_id) !== k) return false;
      return !trazi || normalizirajZaPretragu(o.naziv).includes(trazi);
    });
  }, [obloge, k, q, upisaniPriOdabiru]);

  function postaviKolicinu(id: number, tekst: string) {
    setGreska(null);
    setKolicine((s) => ({ ...s, [id]: tekst }));
  }

  function spremi() {
    if (neispravnih > 0) {
      setGreska("Ispravite označene količine (cijeli broj komada).");
      return;
    }
    if (stavke.length === 0) {
      setGreska("Upišite količinu barem za jednu oblogu.");
      return;
    }
    setGreska(null);
    startSpremanja(async () => {
      // Uspjeh završava redirectom na /obloge s obaviješću.
      const rezultat = await spremiUlaz(stavke, napomena);
      if (rezultat?.greska) setGreska(rezultat.greska);
    });
  }

  const zaglavlje = (
    <div className="hidden flex-col gap-2 lg:flex">
      <Link
        href="/"
        onNavigate={(e) => {
          if (zadrzi("/")) e.preventDefault();
        }}
        className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso"
      >
        <ArrowLeft aria-hidden className="size-5" />
        Početna
      </Link>
      <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">Ulaz robe</h2>
    </div>
  );

  if (obloge.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {zaglavlje}
        <PraznoStanje
          ikona={LayoutGrid}
          naslov="Još nema obloga"
          opis="Prvo dodajte obloge, pa ovdje upisujete robu koja je stigla."
          akcija={<GumbPoveznica href="/obloge/nova">Dodaj prvu oblogu</GumbPoveznica>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {zaglavlje}

      <div className="relative" role="search">
        <label htmlFor="pretraga-ulaza" className="sr-only">
          Traži oblogu
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sivosmeda"
        />
        <input
          id="pretraga-ulaza"
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

      <CipTraka oznaka="Kategorije">
        <Cip odabran={k === ""} onClick={() => setK("")}>
          Sve
        </Cip>
        {kategorije.map((kat) => (
          <Cip key={kat.id} odabran={k === String(kat.id)} onClick={() => setK(String(kat.id))}>
            {kat.naziv}
          </Cip>
        ))}
        {(upisani.size > 0 || k === "upisano") && (
          <Cip
            odabran={k === "upisano"}
            onClick={() => {
              setUpisaniPriOdabiru(upisani);
              setK("upisano");
            }}
          >
            Upisano ({upisani.size})
          </Cip>
        )}
      </CipTraka>

      {prikaz.length === 0 ? (
        <PraznoStanje
          ikona={SearchX}
          naslov="Nema rezultata"
          opis={
            q.trim()
              ? `Nijedna obloga ne sadrži „${q.trim()}”.`
              : k === "upisano"
                ? "Još niste upisali nijednu količinu."
                : "U ovoj kategoriji nema obloga."
          }
          akcija={
            <button
              type="button"
              onClick={() => {
                setK("");
                setQ("");
              }}
              className="min-h-12 font-semibold text-espresso underline underline-offset-4"
            >
              Prikaži sve obloge
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-rub overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina shadow-[var(--shadow-kartica)]">
          {prikaz.map((o) => (
            <Redak
              key={o.id}
              obloga={o}
              tekst={kolicine[o.id] ?? ""}
              onPromjena={(t) => postaviKolicinu(o.id, t)}
              disabled={sprema}
            />
          ))}
        </ul>
      )}

      <Polje
        oznaka="Napomena (neobavezno)"
        placeholder="npr. Kamion iz Zagreba"
        maxLength={200}
        autoComplete="off"
        value={napomena}
        onChange={(e) => setNapomena(e.target.value)}
        disabled={sprema}
        className="mt-1"
      />

      {greska && <Poruka vrsta="greska">{greska}</Poruka>}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-rub bg-pozadina/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <Gumb
          punaSirina
          ucitavanje={sprema}
          disabled={stavke.length === 0}
          onClick={spremi}
          className="min-h-14 text-lg tabular-nums"
        >
          {stavke.length === 0
            ? "Spremi ulaz"
            : `Spremi ulaz · ${brojSImenicom(stavke.length, OBLIK_OBLOGA)} · +${formatBroj(ukupno, 0)} kom`}
        </Gumb>
      </div>
    </div>
  );
}

function Redak({
  obloga: o,
  tekst,
  onPromjena,
  disabled,
}: {
  obloga: OblogaUlaza;
  tekst: string;
  onPromjena: (tekst: string) => void;
  disabled: boolean;
}) {
  const kolicina = kolicinaIzTeksta(tekst);
  const upisano = kolicina !== null && kolicina > 0;

  return (
    <li
      className={`flex flex-col gap-2 p-3 transition-colors sm:flex-row sm:items-center sm:gap-3 ${
        upisano ? "bg-pijesak-svijetli" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-rub">
          <SlikaObloge slika={o.slika} naziv={o.naziv} sizes="48px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 leading-snug font-semibold text-tekst">{o.naziv}</p>
          <p className="text-sm text-sivosmeda tabular-nums">
            Trenutno:{" "}
            <span className={`font-semibold ${o.stanje < 0 ? "text-greska" : "text-espresso"}`}>
              {o.stanje < 0 ? "−" : ""}
              {Math.abs(o.stanje)} kom
            </span>
          </p>
        </div>
      </div>
      <BrojPolje
        oznaka={`Količina: ${o.naziv}`}
        skrivenaOznaka
        jedinica="kom"
        koraci
        najmanje={0}
        placeholder="0"
        vrijednost={tekst}
        onPromjena={onPromjena}
        disabled={disabled}
        greska={kolicina === null ? "Upišite cijeli broj komada." : undefined}
        className="sm:w-56 sm:shrink-0"
      />
    </li>
  );
}
