"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { arhivirajOblogu, obrisiOblogu, vratiOblogu } from "@/app/(app)/obloge/actions";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";

/** „Arhiviraj oblogu" s potvrdom u donjem listu. Nakon arhiviranja akcija preusmjerava na listu. */
export function ArhivirajOblogu({ oblogaId, naziv }: { oblogaId: number; naziv: string }) {
  const obavijest = useObavijest();
  const [otvoren, setOtvoren] = useState(false);
  const [radi, startTransition] = useTransition();

  function arhiviraj() {
    startTransition(async () => {
      const rezultat = await arhivirajOblogu(oblogaId);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
    });
  }

  return (
    <>
      <Gumb varijanta="opasni-tekstualni" className="self-start -ml-3" onClick={() => setOtvoren(true)}>
        <Archive aria-hidden className="size-5" />
        Arhiviraj oblogu
      </Gumb>
      <DonjiList otvoren={otvoren} onZatvori={() => setOtvoren(false)} naslov="Arhivirati oblogu?">
        <div className="flex flex-col gap-4">
          <p>
            <span className="font-semibold">{naziv}</span> nestaje iz liste obloga i odabira u predračunima. Povijest
            kretanja i stari predračuni ostaju. Oblogu možete vratiti iz arhive (čip „Arhivirane”).
          </p>
          <div className="flex flex-col gap-2">
            <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={arhiviraj}>
              Arhiviraj
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setOtvoren(false)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>
    </>
  );
}

/** „Vrati iz arhive": obloga se ponovno prikazuje na listi i u odabiru. */
export function VratiIzArhive({ oblogaId, className = "" }: { oblogaId: number; className?: string }) {
  const obavijest = useObavijest();
  const [radi, startTransition] = useTransition();

  function vrati() {
    startTransition(async () => {
      const rezultat = await vratiOblogu(oblogaId);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
      else if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
    });
  }

  return (
    <Gumb varijanta="sekundarni" ucitavanje={radi} onClick={vrati} className={className}>
      <ArchiveRestore aria-hidden className="size-5" />
      Vrati iz arhive
    </Gumb>
  );
}

/** „Obriši trajno" s potvrdom: samo za obloge koje nikad nisu prodane. Akcija preusmjerava na listu. */
export function ObrisiOblogu({ oblogaId, naziv }: { oblogaId: number; naziv: string }) {
  const obavijest = useObavijest();
  const [otvoren, setOtvoren] = useState(false);
  const [radi, startTransition] = useTransition();

  function obrisi() {
    startTransition(async () => {
      const rezultat = await obrisiOblogu(oblogaId);
      if (rezultat?.greska) {
        obavijest(rezultat.greska, "greska");
        setOtvoren(false);
      }
    });
  }

  return (
    <>
      <Gumb varijanta="opasni-tekstualni" className="-ml-3 self-start" onClick={() => setOtvoren(true)}>
        <Trash2 aria-hidden className="size-5" />
        Obriši trajno
      </Gumb>
      <DonjiList otvoren={otvoren} onZatvori={() => setOtvoren(false)} naslov="Trajno obrisati oblogu?">
        <div className="flex flex-col gap-4">
          <p>
            <span className="font-semibold">{naziv}</span>, njena povijest ulaza i slika bit će trajno obrisani.{" "}
            <span className="font-semibold">Ovo se ne može poništiti.</span>
          </p>
          <p className="text-sm text-sivosmeda">Ako je samo više ne prodajete, bolje je arhivirati je.</p>
          <div className="flex flex-col gap-2">
            <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={obrisi}>
              Obriši trajno
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setOtvoren(false)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>
    </>
  );
}
