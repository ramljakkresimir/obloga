"use client";

import { useState, useTransition } from "react";
import { Copy, Undo2 } from "lucide-react";
import { stornirajBrzuProdaju } from "@/app/(app)/prodaja/actions";
import { ListaPromjene } from "@/components/predracun/PromjenaStanja";
import type { StatusPredracuna } from "@/components/ui/OznakaStatusa";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { useObavijest } from "@/components/ui/Obavijest";

type Props = {
  id: number;
  status: StatusPredracuna;
  stavke: { artiklId: number; naziv: string; komada: number }[];
};

/**
 * Akcije brze prodaje (PRD §5.6): potvrđena se može stornirati (roba se vraća na stanje),
 * a svaka kopirati u novu brzu prodaju po trenutnim cijenama.
 */
export function AkcijeBrzeProdaje({ id, status, stavke }: Props) {
  const obavijest = useObavijest();
  const [stornoOtvoren, setStornoOtvoren] = useState(false);
  const [radi, startTransition] = useTransition();

  function storniraj() {
    startTransition(async () => {
      const rezultat = await stornirajBrzuProdaju(id);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
      else if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
      setStornoOtvoren(false);
    });
  }

  const kopiraj = (
    <GumbPoveznica href={`/prodaja/nova?kopija=${id}`} varijanta="sekundarni" punaSirina>
      <Copy aria-hidden className="size-5" />
      Kopiraj
    </GumbPoveznica>
  );

  return (
    <section aria-label="Akcije" className="flex flex-col gap-2">
      {status === "potvrden" ? (
        <div className="grid grid-cols-2 gap-2">
          {kopiraj}
          <Gumb varijanta="opasni" punaSirina onClick={() => setStornoOtvoren(true)}>
            <Undo2 aria-hidden className="size-5" />
            Storniraj
          </Gumb>
        </div>
      ) : (
        kopiraj
      )}

      <DonjiList otvoren={stornoOtvoren} onZatvori={() => setStornoOtvoren(false)} naslov="Stornirati prodaju?">
        <div className="flex flex-col gap-4">
          <p>Prodaja se poništava, a roba se vraća na stanje:</p>
          <ListaPromjene stavke={stavke} smjer="vraca" />
          <p className="text-sm text-sivosmeda">
            Stornirana prodaja se ne može ponovno potvrditi. Za ispravak je kopirajte.
          </p>
          <div className="flex flex-col gap-2">
            <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={storniraj}>
              Storniraj
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setStornoOtvoren(false)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>
    </section>
  );
}
