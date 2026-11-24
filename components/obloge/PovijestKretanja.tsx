"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { History, Undo2 } from "lucide-react";
import { ponistiUlaz, ucitajJosKretanja } from "@/app/(app)/obloge/actions";
import type { Kretanje, StranicaKretanja } from "@/lib/data/obloge";
import { formatDatum } from "@/lib/format";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";

type Props = { artiklId: number; pocetno: StranicaKretanja };

/**
 * Povijest kretanja obloge: najnovije gore, po 50, „Učitaj još" za starije.
 * Kod neponištenog ulaza je gumb „Poništi" (potvrda u donjem listu).
 * Roditelj daje key = id najnovijeg kretanja, pa se nakon nove promjene stanja lista učitava ispočetka.
 */
export function PovijestKretanja({ artiklId, pocetno }: Props) {
  const obavijest = useObavijest();
  const [starija, setStarija] = useState<Kretanje[]>([]);
  const [josIma, setJosIma] = useState(pocetno.josIma);
  const [ucitava, startUcitavanja] = useTransition();
  const [zaPonistiti, setZaPonistiti] = useState<Kretanje | null>(null);
  const [ponistava, startPonistavanja] = useTransition();

  const kretanja = [...pocetno.kretanja, ...starija];

  function ucitajJos() {
    const zadnje = kretanja.at(-1);
    if (!zadnje) return;
    startUcitavanja(async () => {
      const rezultat = await ucitajJosKretanja(artiklId, zadnje.id);
      if ("greska" in rezultat) {
        obavijest(rezultat.greska, "greska");
        return;
      }
      setStarija((s) => [...s, ...rezultat.kretanja]);
      setJosIma(rezultat.josIma);
    });
  }

  function ponisti(k: Kretanje) {
    startPonistavanja(async () => {
      const rezultat = await ponistiUlaz(k.id);
      if (rezultat?.greska) {
        obavijest(rezultat.greska, "greska");
      } else {
        // Stanje i nova stavka „Poništenje" dolaze s osvježenom stranicom.
        setStarija((s) => s.map((x) => (x.id === k.id ? { ...x, ponisten: true } : x)));
        obavijest(rezultat?.uspjeh ?? "Ulaz je poništen.");
      }
      setZaPonistiti(null);
    });
  }

  if (kretanja.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-sivosmeda">
        <History aria-hidden className="size-8 text-drvo" />
        <p>Još nema promjena stanja.</p>
      </div>
    );
  }

  return (
    <>
      <ol className="-my-2 divide-y divide-rub">
        {kretanja.map((k) => (
          <Redak key={k.id} kretanje={k} onPonisti={() => setZaPonistiti(k)} />
        ))}
      </ol>

      {josIma && (
        <Gumb varijanta="sekundarni" punaSirina className="mt-4" ucitavanje={ucitava} onClick={ucitajJos}>
          Učitaj još
        </Gumb>
      )}

      <DonjiList otvoren={zaPonistiti !== null} onZatvori={() => setZaPonistiti(null)} naslov="Poništiti ulaz?">
        {zaPonistiti && (
          <div className="flex flex-col gap-4">
            <p>
              Ulaz <span className="font-semibold tabular-nums">+{zaPonistiti.promjena} kom</span> od{" "}
              {formatDatum(zaPonistiti.created_at)}
              {zaPonistiti.napomena && <> („{zaPonistiti.napomena}”)</>} bit će poništen, a stanje smanjeno za{" "}
              {zaPonistiti.promjena} kom.
            </p>
            <p className="text-sm text-sivosmeda">
              Poništenje ostaje vidljivo u povijesti. Isti ulaz se ne može poništiti dvaput.
            </p>
            <div className="flex flex-col gap-2">
              <Gumb varijanta="opasni" punaSirina ucitavanje={ponistava} onClick={() => ponisti(zaPonistiti)}>
                Poništi ulaz
              </Gumb>
              <Gumb varijanta="tekstualni" punaSirina disabled={ponistava} onClick={() => setZaPonistiti(null)}>
                Odustani
              </Gumb>
            </div>
          </div>
        )}
      </DonjiList>
    </>
  );
}

function opis(k: Kretanje): { naslov: string; href?: string } {
  const broj = k.predracun?.broj;
  const href = k.predracun
    ? k.predracun.vrsta === "predracun"
      ? `/predracuni/${k.predracun.id}`
      : `/prodaja/${k.predracun.id}`
    : undefined;
  switch (k.tip) {
    case "ulaz":
      return { naslov: "Ulaz robe" };
    case "predracun":
      return { naslov: broj ? `Predračun ${broj}` : "Predračun", href };
    case "brza_prodaja":
      return { naslov: "Brza prodaja", href };
    case "storno":
      return { naslov: broj ? `Storno ${broj}` : "Storno brze prodaje", href };
    case "ponistenje":
      return { naslov: "Poništenje ulaza" };
  }
}

function Redak({ kretanje: k, onPonisti }: { kretanje: Kretanje; onPonisti: () => void }) {
  const { naslov, href } = opis(k);
  const pozitivno = k.promjena > 0;
  const detalji = [k.napomena, k.vlasnik, formatDatum(k.created_at)].filter(Boolean).join(" · ");

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${k.ponisten ? "text-sivosmeda line-through" : "text-tekst"}`}>
          {href ? (
            <Link href={href} className="underline decoration-rub underline-offset-4 hover:decoration-espresso">
              {naslov}
            </Link>
          ) : (
            naslov
          )}
        </p>
        <p className="text-sm text-sivosmeda">{detalji}</p>
        {k.ponisten && (
          <span className="mt-1 inline-flex h-6 items-center rounded-full bg-[#eeeae6] px-2.5 text-[13px] leading-[18px] font-semibold text-sivosmeda">
            Poništeno
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span
          className={`font-naslov text-lg font-semibold tabular-nums ${
            k.ponisten ? "text-sivosmeda line-through" : pozitivno ? "text-uspjeh" : "text-greska"
          }`}
        >
          {pozitivno ? "+" : "−"}
          {Math.abs(k.promjena)}
        </span>
        {k.tip === "ulaz" && !k.ponisten && (
          <button
            type="button"
            onClick={onPonisti}
            className="-mr-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-espresso hover:bg-rub/50"
          >
            <Undo2 aria-hidden className="size-4" />
            Poništi
          </button>
        )}
      </div>
    </li>
  );
}
