"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { PackagePlus } from "lucide-react";
import { dodajNaStanje, type StanjeUlaza } from "@/app/(app)/obloge/actions";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";

/** Gumb „Dodaj na stanje" na detaljima obloge: donji list s količinom i napomenom (ulaz robe). */
export function DodajNaStanje({ oblogaId, naziv }: { oblogaId: number; naziv: string }) {
  const [otvoren, setOtvoren] = useState(false);
  // Novi ključ pri svakom otvaranju: forma kreće prazna.
  const [kljuc, setKljuc] = useState(0);

  return (
    <>
      <Gumb
        punaSirina
        onClick={() => {
          setKljuc((k) => k + 1);
          setOtvoren(true);
        }}
      >
        <PackagePlus aria-hidden className="size-5" />
        Dodaj na stanje
      </Gumb>
      <DonjiList otvoren={otvoren} onZatvori={() => setOtvoren(false)} naslov="Dodaj na stanje">
        {otvoren && <FormaUlaza key={kljuc} oblogaId={oblogaId} naziv={naziv} onGotovo={() => setOtvoren(false)} />}
      </DonjiList>
    </>
  );
}

function FormaUlaza({ oblogaId, naziv, onGotovo }: { oblogaId: number; naziv: string; onGotovo: () => void }) {
  const obavijest = useObavijest();
  const [stanje, posalji, radi] = useActionState<StanjeUlaza, FormData>(async (prethodno, formData) => {
    const rezultat = await dodajNaStanje(prethodno, formData);
    if (rezultat?.uspjeh) {
      obavijest(rezultat.uspjeh);
      onGotovo();
    }
    return rezultat;
  }, undefined);

  function spremi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => posalji(formData));
  }

  return (
    <form onSubmit={spremi} noValidate className="flex flex-col gap-4">
      <p className="text-sivosmeda">{naziv}</p>
      <input type="hidden" name="id" value={oblogaId} />
      <BrojPolje
        oznaka="Količina"
        name="kolicina"
        jedinica="kom"
        koraci
        najmanje={0}
        autoFocus
        greska={stanje?.greske?.kolicina}
      />
      <Polje
        oznaka="Napomena (neobavezno)"
        name="napomena"
        placeholder="npr. Kamion iz Zagreba"
        maxLength={200}
        autoComplete="off"
        greska={stanje?.greske?.napomena}
      />
      {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      <Gumb type="submit" punaSirina ucitavanje={radi}>
        Dodaj na stanje
      </Gumb>
    </form>
  );
}
