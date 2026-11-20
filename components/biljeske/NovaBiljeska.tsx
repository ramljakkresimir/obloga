"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { dodajBiljesku, type StanjeBiljeske } from "@/app/(app)/biljeske/actions";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { useObavijest } from "@/components/ui/Obavijest";
import { Poruka } from "@/components/ui/Poruka";
import { PoljeTeksta } from "./PoljeTeksta";

/** Brzi unos bilješke na vrhu ekrana. Tekst ostaje u polju ako spremanje ne uspije. */
export function NovaBiljeska() {
  const obavijest = useObavijest();
  const [tekst, setTekst] = useState("");
  const [stanje, posalji] = useActionState<StanjeBiljeske, FormData>(async (prethodno, formData) => {
    const rezultat = await dodajBiljesku(prethodno, formData);
    if (rezultat?.uspjeh) {
      setTekst("");
      obavijest(rezultat.uspjeh);
    }
    return rezultat;
  }, undefined);

  return (
    <Kartica>
      <form action={posalji} className="flex flex-col gap-3">
        <PoljeTeksta
          name="tekst"
          oznaka="Nova bilješka"
          skrivenaOznaka
          placeholder="Nova bilješka…"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          maxLength={2000}
          greska={stanje?.greske?.tekst}
        />
        {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
        <Gumb type="submit" className="self-end">
          <Plus aria-hidden className="size-5" />
          Dodaj
        </Gumb>
      </form>
    </Kartica>
  );
}
