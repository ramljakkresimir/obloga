"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Ellipsis, NotebookPen, Pencil, SearchX, Trash2 } from "lucide-react";
import { obrisiBiljesku, promijeniObavljeno, urediBiljesku, type StanjeBiljeske } from "@/app/(app)/biljeske/actions";
import type { Biljeska } from "@/lib/data/biljeske";
import { formatDatumKratko } from "@/lib/format";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";
import { Poruka } from "@/components/ui/Poruka";
import { PraznoStanje } from "@/components/ui/PraznoStanje";
import { PoljeTeksta } from "./PoljeTeksta";

type Nacin = "izbornik" | "uredi" | "obrisi";

const naslovi: Record<Nacin, string> = {
  izbornik: "Bilješka",
  uredi: "Uredi bilješku",
  obrisi: "Obrisati bilješku?",
};

export function ListaBiljeski({ biljeske, pretraga }: { biljeske: Biljeska[]; pretraga: string }) {
  const obavijest = useObavijest();
  const [, startTransition] = useTransition();
  const [prikaz, postaviOptimisticno] = useOptimistic(biljeske, (stanje, p: { id: number; obavljeno: boolean }) =>
    stanje.map((b) => (b.id === p.id ? { ...b, obavljeno: p.obavljeno } : b)),
  );
  const [odabrana, setOdabrana] = useState<Biljeska | null>(null);
  const [nacin, setNacin] = useState<Nacin>("izbornik");

  function oznaci(b: Biljeska) {
    const obavljeno = !b.obavljeno;
    startTransition(async () => {
      postaviOptimisticno({ id: b.id, obavljeno });
      const rezultat = await promijeniObavljeno(b.id, obavljeno);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
      else if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
    });
  }

  function otvori(b: Biljeska) {
    setNacin("izbornik");
    setOdabrana(b);
  }

  function zatvori() {
    setOdabrana(null);
  }

  if (biljeske.length === 0) {
    return pretraga ? (
      <PraznoStanje
        ikona={SearchX}
        naslov="Nema rezultata"
        opis={`Nijedna bilješka ne sadrži „${pretraga}".`}
        akcija={
          <Link href="/biljeske" replace className="font-semibold text-espresso underline underline-offset-4">
            Očisti pretragu
          </Link>
        }
      />
    ) : (
      <PraznoStanje ikona={NotebookPen} naslov="Još nema bilješki" opis="Zapišite prvu bilješku u polje iznad." />
    );
  }

  const otvorene = prikaz.filter((b) => !b.obavljeno);
  const obavljene = prikaz.filter((b) => b.obavljeno);

  return (
    <>
      {otvorene.length > 0 ? (
        <ul className="divide-y divide-rub overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina shadow-[var(--shadow-kartica)]">
          {otvorene.map((b) => (
            <Redak key={b.id} biljeska={b} onOznaci={oznaci} onIzbornik={otvori} />
          ))}
        </ul>
      ) : (
        <p className="px-1 text-sivosmeda">{pretraga ? "Nema otvorenih bilješki za ovu pretragu." : "Sve je obavljeno."}</p>
      )}

      {obavljene.length > 0 && (
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-1 font-naslov text-lg font-semibold text-espresso [&::-webkit-details-marker]:hidden">
            Obavljeno ({obavljene.length})
            <ChevronDown aria-hidden className="size-5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-rub overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina">
            {obavljene.map((b) => (
              <Redak key={b.id} biljeska={b} onOznaci={oznaci} onIzbornik={otvori} />
            ))}
          </ul>
        </details>
      )}

      <DonjiList otvoren={odabrana !== null} onZatvori={zatvori} naslov={naslovi[nacin]}>
        {odabrana && nacin === "izbornik" && (
          <div className="flex flex-col gap-2">
            <p className="mb-2 line-clamp-3 whitespace-pre-line text-sivosmeda">{odabrana.tekst}</p>
            <Gumb varijanta="sekundarni" punaSirina onClick={() => setNacin("uredi")}>
              <Pencil aria-hidden className="size-5" />
              Uredi
            </Gumb>
            <Gumb varijanta="opasni-tekstualni" punaSirina onClick={() => setNacin("obrisi")}>
              <Trash2 aria-hidden className="size-5" />
              Obriši
            </Gumb>
          </div>
        )}
        {odabrana && nacin === "uredi" && (
          <UrediBiljesku
            key={odabrana.id}
            biljeska={odabrana}
            onGotovo={(poruka) => {
              zatvori();
              obavijest(poruka);
            }}
          />
        )}
        {odabrana && nacin === "obrisi" && (
          <ObrisiBiljesku
            biljeska={odabrana}
            onOdustani={zatvori}
            onGotovo={(poruka) => {
              zatvori();
              obavijest(poruka);
            }}
          />
        )}
      </DonjiList>
    </>
  );
}

function Redak({
  biljeska: b,
  onOznaci,
  onIzbornik,
}: {
  biljeska: Biljeska;
  onOznaci: (b: Biljeska) => void;
  onIzbornik: (b: Biljeska) => void;
}) {
  return (
    <li className="flex items-start gap-1 py-1 pr-1 pl-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={b.obavljeno}
        aria-label={`Obavljeno: ${b.tekst.slice(0, 60)}`}
        onClick={() => onOznaci(b)}
        className="flex size-12 shrink-0 items-center justify-center rounded-full"
      >
        <span
          className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
            b.obavljeno ? "border-uspjeh bg-uspjeh text-white" : "border-sivosmeda"
          }`}
        >
          {b.obavljeno && <Check aria-hidden className="size-4" strokeWidth={3} />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-3">
        <p className={`line-clamp-3 break-words whitespace-pre-line ${b.obavljeno ? "text-sivosmeda line-through" : "text-tekst"}`}>
          {b.tekst}
        </p>
        <p className="mt-1 text-sm text-sivosmeda tabular-nums">{formatDatumKratko(b.created_at)}</p>
      </div>
      <button
        type="button"
        aria-label="Mogućnosti bilješke"
        onClick={() => onIzbornik(b)}
        className="flex size-12 shrink-0 items-center justify-center rounded-full text-sivosmeda hover:text-espresso"
      >
        <Ellipsis aria-hidden className="size-6" />
      </button>
    </li>
  );
}

function UrediBiljesku({ biljeska, onGotovo }: { biljeska: Biljeska; onGotovo: (poruka: string) => void }) {
  const [stanje, posalji] = useActionState<StanjeBiljeske, FormData>(async (prethodno, formData) => {
    const rezultat = await urediBiljesku(prethodno, formData);
    if (rezultat?.uspjeh) onGotovo(rezultat.uspjeh);
    return rezultat;
  }, undefined);

  return (
    <form action={posalji} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={biljeska.id} />
      <PoljeTeksta
        name="tekst"
        oznaka="Tekst bilješke"
        defaultValue={biljeska.tekst}
        maxLength={2000}
        greska={stanje?.greske?.tekst}
        autoFocus
      />
      {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      <Gumb type="submit" punaSirina>
        Spremi
      </Gumb>
    </form>
  );
}

function ObrisiBiljesku({
  biljeska,
  onOdustani,
  onGotovo,
}: {
  biljeska: Biljeska;
  onOdustani: () => void;
  onGotovo: (poruka: string) => void;
}) {
  const [greska, setGreska] = useState<string>();
  const [radi, startTransition] = useTransition();

  function obrisi() {
    startTransition(async () => {
      const rezultat = await obrisiBiljesku(biljeska.id);
      if (rezultat?.uspjeh) onGotovo(rezultat.uspjeh);
      else setGreska(rezultat?.greska ?? "Bilješka nije obrisana. Pokušajte ponovno.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="line-clamp-3 whitespace-pre-line text-sivosmeda">{biljeska.tekst}</p>
      <p>Bilješka će biti trajno obrisana.</p>
      {greska && <Poruka vrsta="greska">{greska}</Poruka>}
      <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={obrisi}>
        <Trash2 aria-hidden className="size-5" />
        Obriši
      </Gumb>
      <Gumb varijanta="tekstualni" punaSirina onClick={onOdustani} disabled={radi}>
        Odustani
      </Gumb>
    </div>
  );
}
