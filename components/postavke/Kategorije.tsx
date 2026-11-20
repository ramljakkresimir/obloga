"use client";

import { useActionState, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  dodajKategoriju,
  obrisiKategoriju,
  pomakniKategoriju,
  preimenujKategoriju,
  type StanjeKategorije,
} from "@/app/(app)/postavke/actions";
import type { Kategorija } from "@/lib/data/postavke";
import { brojSImenicom, OBLIK_OBLOGA } from "@/lib/format";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { useObavijest } from "@/components/ui/Obavijest";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";

type Otvoreno = { nacin: "dodaj" } | { nacin: "uredi" | "obrisi"; kategorija: Kategorija };

const naslovi: Record<Otvoreno["nacin"], string> = {
  dodaj: "Nova kategorija",
  uredi: "Uredi kategoriju",
  obrisi: "Obrisati kategoriju?",
};

function zamijeni(lista: Kategorija[], { id, smjer }: { id: number; smjer: -1 | 1 }): Kategorija[] {
  const i = lista.findIndex((k) => k.id === id);
  const j = i + smjer;
  if (i === -1 || j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

/** Kategorije: dodavanje, preimenovanje, redoslijed (strelice) i brisanje praznih. Sve se sprema odmah. */
export function Kategorije({ kategorije }: { kategorije: Kategorija[] }) {
  const obavijest = useObavijest();
  const [, startTransition] = useTransition();
  const [prikaz, pomakniOptimisticno] = useOptimistic(kategorije, zamijeni);
  const [otvoreno, setOtvoreno] = useState<Otvoreno | null>(null);

  function pomakni(k: Kategorija, smjer: -1 | 1) {
    startTransition(async () => {
      pomakniOptimisticno({ id: k.id, smjer });
      const rezultat = await pomakniKategoriju(k.id, smjer);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
    });
  }

  function zatvori() {
    setOtvoreno(null);
  }

  function gotovo(poruka: string) {
    zatvori();
    obavijest(poruka);
  }

  return (
    <Kartica naslov="Kategorije">
      {prikaz.length === 0 ? (
        <p className="text-sivosmeda">Još nema kategorija. Dodajte prvu.</p>
      ) : (
        <ol className="-mt-2 divide-y divide-rub">
          {prikaz.map((k, indeks) => (
            <li key={k.id} className="flex items-center gap-1 py-1">
              <div className="min-w-0 flex-1 py-2">
                <p className="truncate font-semibold text-tekst">{k.naziv}</p>
                <p className="text-sm text-sivosmeda tabular-nums">{brojSImenicom(k.brojObloga, OBLIK_OBLOGA)}</p>
              </div>
              <GumbIkona oznaka={`Pomakni gore: ${k.naziv}`} disabled={indeks === 0} onClick={() => pomakni(k, -1)}>
                <ChevronUp aria-hidden className="size-6" />
              </GumbIkona>
              <GumbIkona
                oznaka={`Pomakni dolje: ${k.naziv}`}
                disabled={indeks === prikaz.length - 1}
                onClick={() => pomakni(k, 1)}
              >
                <ChevronDown aria-hidden className="size-6" />
              </GumbIkona>
              <GumbIkona oznaka={`Uredi: ${k.naziv}`} onClick={() => setOtvoreno({ nacin: "uredi", kategorija: k })}>
                <Pencil aria-hidden className="size-5" />
              </GumbIkona>
            </li>
          ))}
        </ol>
      )}

      <Gumb varijanta="tekstualni" className="mt-2 -ml-3" onClick={() => setOtvoreno({ nacin: "dodaj" })}>
        <Plus aria-hidden className="size-5" />
        Dodaj kategoriju
      </Gumb>

      <DonjiList otvoren={otvoreno !== null} onZatvori={zatvori} naslov={otvoreno ? naslovi[otvoreno.nacin] : ""}>
        {otvoreno?.nacin === "dodaj" && <FormaKategorije key="nova" onGotovo={gotovo} />}
        {otvoreno?.nacin === "uredi" && (
          <div className="flex flex-col gap-2">
            <FormaKategorije key={otvoreno.kategorija.id} kategorija={otvoreno.kategorija} onGotovo={gotovo} />
            <Gumb
              varijanta="opasni-tekstualni"
              punaSirina
              onClick={() => setOtvoreno({ nacin: "obrisi", kategorija: otvoreno.kategorija })}
            >
              <Trash2 aria-hidden className="size-5" />
              Obriši kategoriju
            </Gumb>
          </div>
        )}
        {otvoreno?.nacin === "obrisi" && (
          <ObrisiKategoriju kategorija={otvoreno.kategorija} onOdustani={zatvori} onGotovo={gotovo} />
        )}
      </DonjiList>
    </Kartica>
  );
}

function GumbIkona({
  oznaka,
  disabled,
  onClick,
  children,
}: {
  oznaka: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={oznaka}
      disabled={disabled}
      onClick={onClick}
      className="flex size-12 shrink-0 items-center justify-center rounded-full text-sivosmeda hover:text-espresso disabled:opacity-30 disabled:hover:text-sivosmeda"
    >
      {children}
    </button>
  );
}

/** Dodavanje (bez kategorije) ili preimenovanje. Naziv je kontroliran da ostane nakon greške. */
function FormaKategorije({ kategorija, onGotovo }: { kategorija?: Kategorija; onGotovo: (poruka: string) => void }) {
  const [naziv, setNaziv] = useState(kategorija?.naziv ?? "");
  const [stanje, posalji] = useActionState<StanjeKategorije, FormData>(async (prethodno, formData) => {
    const rezultat = kategorija ? await preimenujKategoriju(prethodno, formData) : await dodajKategoriju(prethodno, formData);
    if (rezultat?.uspjeh) onGotovo(rezultat.uspjeh);
    return rezultat;
  }, undefined);

  return (
    <form action={posalji} noValidate className="flex flex-col gap-3">
      {kategorija && <input type="hidden" name="id" value={kategorija.id} />}
      <Polje
        oznaka="Naziv kategorije"
        name="naziv"
        value={naziv}
        onChange={(e) => setNaziv(e.target.value)}
        maxLength={60}
        autoComplete="off"
        autoFocus
        required
        greska={stanje?.greske?.naziv}
      />
      {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      <Gumb type="submit" punaSirina>
        {kategorija ? "Spremi" : "Dodaj"}
      </Gumb>
    </form>
  );
}

function ObrisiKategoriju({
  kategorija,
  onOdustani,
  onGotovo,
}: {
  kategorija: Kategorija;
  onOdustani: () => void;
  onGotovo: (poruka: string) => void;
}) {
  const [greska, setGreska] = useState<string>();
  const [radi, startTransition] = useTransition();

  function obrisi() {
    startTransition(async () => {
      const rezultat = await obrisiKategoriju(kategorija.id);
      if (rezultat?.uspjeh) onGotovo(rezultat.uspjeh);
      else setGreska(rezultat?.greska ?? "Kategorija nije obrisana. Pokušajte ponovno.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold">{kategorija.naziv}</p>
      <p className="text-sivosmeda">Kategorija će biti trajno obrisana. Može se obrisati samo ako u njoj nema obloga.</p>
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
