"use client";

import { useMemo, useState, useTransition } from "react";
import { CircleCheck, Copy, Pencil, Undo2, X } from "lucide-react";
import { odbijPredracun, potvrdiPredracun, stornirajPredracun } from "@/app/(app)/predracuni/actions";
import type { StanjeForme } from "@/lib/akcije";
import type { PredracunPdf } from "@/lib/pdf";
import { manjak } from "@/lib/predracuni";
import { PdfGumbi } from "@/components/pdf/PdfGumbi";
import type { StatusPredracuna } from "@/components/ui/OznakaStatusa";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { useObavijest } from "@/components/ui/Obavijest";
import { ListaPromjene, UpozorenjeManjka } from "./PromjenaStanja";

type Stavka = { artiklId: number; naziv: string; komada: number; stanje: number };

type Props = {
  id: number;
  broj: string;
  status: StatusPredracuna;
  /** Stavke s trenutnim stanjem obloge (za upozorenje o manjku). */
  stavke: Stavka[];
  /** Model PDF-a (lib/pdf.ts) za Pošalji i Preuzmi PDF. */
  pdf: PredracunPdf;
};

type Dijalog = "potvrdi" | "odbij" | "storniraj" | null;

/** Akcije predračuna po statusu (PRD §5.5, Design.md §9): Pošalji i Preuzmi PDF na vrhu. */
export function AkcijePredracuna({ id, broj, status, stavke, pdf }: Props) {
  const obavijest = useObavijest();
  const [dijalog, setDijalog] = useState<Dijalog>(null);
  const [radi, startTransition] = useTransition();

  const nedostaje = useMemo(
    () => manjak(stavke, new Map(stavke.map((s) => [s.artiklId, s.stanje]))),
    [stavke],
  );

  function izvrsi(akcija: (id: number) => Promise<StanjeForme>) {
    startTransition(async () => {
      const rezultat = await akcija(id);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
      else if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
      setDijalog(null);
    });
  }

  const kopiraj = (
    <GumbPoveznica href={`/predracuni/novi?kopija=${id}`} varijanta="sekundarni" punaSirina>
      <Copy aria-hidden className="size-5" />
      Kopiraj
    </GumbPoveznica>
  );

  return (
    <section aria-label="Akcije" className="flex flex-col gap-2">
      {(status === "otvoren" || status === "potvrden") && <PdfGumbi model={pdf} />}

      {status === "otvoren" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <GumbPoveznica href={`/predracuni/${id}/uredi`} varijanta="sekundarni" punaSirina>
              <Pencil aria-hidden className="size-5" />
              Uredi
            </GumbPoveznica>
            {kopiraj}
          </div>
          <Gumb punaSirina className="mt-2 min-h-14 text-lg" onClick={() => setDijalog("potvrdi")}>
            <CircleCheck aria-hidden className="size-5" />
            Potvrdi – kupac prihvatio
          </Gumb>
          <Gumb varijanta="opasni-tekstualni" punaSirina onClick={() => setDijalog("odbij")}>
            <X aria-hidden className="size-5" />
            Odbij – kupac odustao
          </Gumb>
        </>
      )}

      {status === "potvrden" && (
        <div className="grid grid-cols-2 gap-2">
          {kopiraj}
          <Gumb varijanta="opasni" punaSirina onClick={() => setDijalog("storniraj")}>
            <Undo2 aria-hidden className="size-5" />
            Storniraj
          </Gumb>
        </div>
      )}

      {(status === "odbijen" || status === "storniran") && kopiraj}

      <DonjiList otvoren={dijalog === "potvrdi"} onZatvori={() => setDijalog(null)} naslov="Potvrditi predračun?">
        <div className="flex flex-col gap-4">
          <p>
            Kupac je prihvatio predračun <span className="font-semibold">{broj}</span>. Sa stanja se skida:
          </p>
          <ListaPromjene stavke={stavke} smjer="skida" />
          <UpozorenjeManjka nedostaje={nedostaje} />
          <div className="flex flex-col gap-2">
            <Gumb punaSirina ucitavanje={radi} onClick={() => izvrsi(potvrdiPredracun)}>
              {nedostaje.length > 0 ? "Svejedno potvrdi" : "Potvrdi"}
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setDijalog(null)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>

      <DonjiList otvoren={dijalog === "odbij"} onZatvori={() => setDijalog(null)} naslov="Odbiti predračun?">
        <div className="flex flex-col gap-4">
          <p>
            Kupac je odustao od predračuna <span className="font-semibold">{broj}</span>. Stanje se ne mijenja.
          </p>
          <p className="text-sm text-sivosmeda">
            Odbijeni predračun se više ne može uređivati ni potvrditi, ali ga možete kopirati.
          </p>
          <div className="flex flex-col gap-2">
            <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={() => izvrsi(odbijPredracun)}>
              Odbij
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setDijalog(null)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>

      <DonjiList otvoren={dijalog === "storniraj"} onZatvori={() => setDijalog(null)} naslov="Stornirati predračun?">
        <div className="flex flex-col gap-4">
          <p>
            Potvrda predračuna <span className="font-semibold">{broj}</span> se poništava, a roba se vraća na stanje:
          </p>
          <ListaPromjene stavke={stavke} smjer="vraca" />
          <p className="text-sm text-sivosmeda">
            Stornirani predračun se ne može ponovno potvrditi. Za ispravak ga kopirajte.
          </p>
          <div className="flex flex-col gap-2">
            <Gumb varijanta="opasni" punaSirina ucitavanje={radi} onClick={() => izvrsi(stornirajPredracun)}>
              Storniraj
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina disabled={radi} onClick={() => setDijalog(null)}>
              Odustani
            </Gumb>
          </div>
        </div>
      </DonjiList>
    </section>
  );
}
