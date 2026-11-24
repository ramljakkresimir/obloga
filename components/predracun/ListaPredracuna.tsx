"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Search, SearchX, X } from "lucide-react";
import { ucitajJosPredracuna } from "@/app/(app)/predracuni/actions";
import type { FilterStatusa, RedakPredracuna, StranicaPredracuna } from "@/lib/data/predracuni";
import { formatDatum, formatKM } from "@/lib/format";
import { zapamtiPovratak } from "@/lib/povratak";
import { Cip, CipTraka } from "@/components/ui/Cip";
import { Gumb } from "@/components/ui/Gumb";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { useObavijest } from "@/components/ui/Obavijest";
import { OznakaStatusa } from "@/components/ui/OznakaStatusa";
import { PraznoStanje } from "@/components/ui/PraznoStanje";

type Props = {
  filteri: { vrijednost: FilterStatusa; naziv: string }[];
  zadani: FilterStatusa;
  status: FilterStatusa;
  q: string;
  pocetno: StranicaPredracuna;
};

const PUTANJA = "/predracuni";

/**
 * Lista predračuna s čipovima statusa i pretragom (kupac, mjesto ili broj). Filtrira se na serveru:
 * promjena se upisuje u URL (?s=&q=), pa stranica dolazi s novim podacima. Pretraga čeka 300 ms od zadnjeg tipkanja.
 */
export function ListaPredracuna({ filteri, zadani, status, q: pocetniQ, pocetno }: Props) {
  const router = useRouter();
  const obavijest = useObavijest();
  const [q, setQ] = useState(pocetniQ);
  const [starija, setStarija] = useState<RedakPredracuna[]>([]);
  const [josIma, setJosIma] = useState(pocetno.josIma);
  // Nova prva stranica sa servera (filter, pretraga ili osvježavanje): „Učitaj još" kreće ispočetka.
  // Bez remounta, da polje pretrage ne izgubi tekst i fokus dok se tipka.
  const [prvaStranica, setPrvaStranica] = useState(pocetno);
  if (pocetno !== prvaStranica) {
    setPrvaStranica(pocetno);
    setStarija([]);
    setJosIma(pocetno.josIma);
  }
  const [filtrira, startFiltriranja] = useTransition();
  const [ucitava, startUcitavanja] = useTransition();
  const odgoda = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(odgoda.current), []);

  function idiNa(noviStatus: FilterStatusa, noviQ: string) {
    const params = new URLSearchParams();
    if (noviStatus !== zadani) params.set("s", noviStatus);
    if (noviQ.trim()) params.set("q", noviQ.trim());
    const url = params.size ? `${PUTANJA}?${params}` : PUTANJA;
    zapamtiPovratak(PUTANJA, url);
    startFiltriranja(() => router.replace(url, { scroll: false }));
  }

  function promijeniPretragu(noviQ: string) {
    setQ(noviQ);
    clearTimeout(odgoda.current);
    odgoda.current = setTimeout(() => idiNa(status, noviQ), 300);
  }

  const predracuni = [...pocetno.predracuni, ...starija];

  function ucitajJos() {
    const zadnji = predracuni.at(-1);
    if (!zadnji) return;
    startUcitavanja(async () => {
      const rezultat = await ucitajJosPredracuna(status, pocetniQ, zadnji.id);
      if ("greska" in rezultat) {
        obavijest(rezultat.greska, "greska");
        return;
      }
      setStarija((s) => [...s, ...rezultat.predracuni]);
      setJosIma(rezultat.josIma);
    });
  }

  const filtrirano = status !== "svi" || pocetniQ.trim() !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative" role="search">
        <label htmlFor="pretraga-predracuna" className="sr-only">
          Traži po kupcu, mjestu ili broju
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sivosmeda"
        />
        <input
          id="pretraga-predracuna"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => promijeniPretragu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur(); // zatvori tipkovnicu na mobitelu
          }}
          placeholder="Kupac ili broj…"
          className="h-12 w-full rounded-[var(--radius-polje)] border border-rub bg-povrsina pr-12 pl-12 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              clearTimeout(odgoda.current);
              setQ("");
              idiNa(status, "");
            }}
            aria-label="Očisti pretragu"
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-polje)] text-sivosmeda hover:text-espresso"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <CipTraka oznaka="Status">
        {filteri.map((f) => (
          <Cip
            key={f.vrijednost}
            odabran={status === f.vrijednost}
            onClick={() => {
              clearTimeout(odgoda.current);
              idiNa(f.vrijednost, q);
            }}
          >
            {f.naziv}
          </Cip>
        ))}
      </CipTraka>

      <div aria-busy={filtrira} className={`transition-opacity ${filtrira ? "opacity-60" : ""}`}>
        {predracuni.length === 0 ? (
          <PraznoStanje
            ikona={pocetniQ.trim() ? SearchX : FileText}
            naslov={pocetniQ.trim() ? "Nema rezultata" : "Nema predračuna"}
            opis={
              pocetniQ.trim()
                ? `Nijedan predračun ne odgovara „${pocetniQ.trim()}”.`
                : filtrirano
                  ? "Nema predračuna s ovim statusom."
                  : "Napravite prvi predračun za kupca."
            }
            akcija={
              filtrirano && status !== "svi" ? (
                <button
                  type="button"
                  onClick={() => idiNa("svi", "")}
                  className="min-h-12 font-semibold text-espresso underline underline-offset-4"
                >
                  Prikaži sve predračune
                </button>
              ) : !filtrirano ? (
                <GumbPoveznica href="/predracuni/novi">Novi predračun</GumbPoveznica>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-rub overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina shadow-[var(--shadow-kartica)]">
            {predracuni.map((p) => (
              <Redak key={p.id} predracun={p} />
            ))}
          </ul>
        )}
      </div>

      {josIma && (
        <Gumb varijanta="sekundarni" punaSirina ucitavanje={ucitava} onClick={ucitajJos}>
          Učitaj još
        </Gumb>
      )}
    </div>
  );
}

function Redak({ predracun: p }: { predracun: RedakPredracuna }) {
  const kupac = [p.kupac_ime, p.kupac_mjesto].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/predracuni/${p.id}`}
        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-pozadina ${
          p.status === "odbijen" || p.status === "storniran" ? "opacity-70" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda tabular-nums">{p.broj}</p>
          <p className={`truncate font-semibold ${kupac ? "text-tekst" : "text-sivosmeda italic"}`}>
            {kupac || "Bez kupca"}
          </p>
          <p className="text-sm text-sivosmeda tabular-nums">{formatDatum(p.created_at)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-naslov font-semibold text-espresso tabular-nums">{formatKM(p.ukupno)}</span>
          <OznakaStatusa status={p.status} />
        </div>
      </Link>
    </li>
  );
}
