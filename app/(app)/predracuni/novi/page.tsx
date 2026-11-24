import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiPostavke } from "@/lib/data/postavke";
import { dohvatiOdabirObloga, dohvatiPredracun, uSpremljeni } from "@/lib/data/predracuni";
import { prazanUredivac, uredivacIzKopije, type StanjeUredivaca } from "@/lib/predracuni";
import { KosturUredivaca } from "@/components/predracun/Kosturi";
import { UredivacPredracuna } from "@/components/predracun/UredivacPredracuna";

export const metadata: Metadata = { title: "Novi predračun" };

/** Novi predračun; `?kopija=ID` popunjava uređivač iz postojećeg predračuna (PRD §5.5 Kopiraj). */
export default function NoviPredracunPage({ searchParams }: PageProps<"/predracuni/novi">) {
  return (
    <Suspense fallback={<KosturUredivaca />}>
      <Uredivac searchParams={searchParams} />
    </Suspense>
  );
}

async function Uredivac({ searchParams }: Pick<PageProps<"/predracuni/novi">, "searchParams">) {
  const { kopija } = await searchParams;
  const kopijaId = typeof kopija === "string" ? Number(kopija) : NaN;
  const jeKopija = Number.isSafeInteger(kopijaId) && kopijaId > 0;

  const [{ obloge, kategorije }, postavke, izvor, sveObloge] = await Promise.all([
    dohvatiOdabirObloga(),
    dohvatiPostavke(),
    jeKopija ? dohvatiPredracun(kopijaId) : null,
    jeKopija ? dohvatiObloge() : null,
  ]);

  let pocetno: StanjeUredivaca = prazanUredivac();
  let poruka: string | undefined;
  if (jeKopija) {
    if (!izvor || izvor.vrsta !== "predracun" || !sveObloge) notFound();
    const kopija = uredivacIzKopije(uSpremljeni(izvor), new Map(sveObloge.map((o) => [o.id, o])));
    pocetno = kopija.stanje;
    poruka = `Kopija predračuna ${izvor.broj}: cijene su trenutne, kupac je prazan. Novi broj dobiva tek kad spremite.`;
    if (kopija.preskocene.length > 0) {
      poruka += ` Arhivirane obloge su preskočene: ${kopija.preskocene.join(", ")}.`;
    }
  }

  return (
    <UredivacPredracuna
      key={jeKopija ? `kopija-${kopijaId}` : "novi"}
      predracunId={null}
      kopijaOd={jeKopija ? kopijaId : null}
      pocetno={pocetno}
      obloge={obloge}
      kategorije={kategorije}
      pdv={{ uSustavu: postavke.u_sustavu_pdv, cijeneSaPdv: postavke.cijene_sa_pdv, stopa: postavke.pdv_stopa }}
      zadanaCijenaLjepila={postavke.ljepilo_cijena}
      poruka={poruka}
    />
  );
}
