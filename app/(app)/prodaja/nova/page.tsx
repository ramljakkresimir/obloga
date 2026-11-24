import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiPostavke } from "@/lib/data/postavke";
import { dohvatiOdabirObloga, dohvatiPredracun, uSpremljeni } from "@/lib/data/predracuni";
import { formatDatum } from "@/lib/format";
import { prazanUredivac, uredivacIzKopije, type StanjeUredivaca } from "@/lib/predracuni";
import { KosturUredivaca } from "@/components/predracun/Kosturi";
import { UredivacPredracuna } from "@/components/predracun/UredivacPredracuna";

export const metadata: Metadata = { title: "Brza prodaja" };

/**
 * Brza prodaja (PRD §5.6): isti uređivač stavki kao predračun, bez kupca i dodataka.
 * `?kopija=ID` popunjava uređivač iz postojeće brze prodaje (npr. ispravak nakon storna).
 */
export default function BrzaProdajaPage({ searchParams }: PageProps<"/prodaja/nova">) {
  return (
    <Suspense fallback={<KosturUredivaca />}>
      <Uredivac searchParams={searchParams} />
    </Suspense>
  );
}

async function Uredivac({ searchParams }: Pick<PageProps<"/prodaja/nova">, "searchParams">) {
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
    if (!izvor || izvor.vrsta !== "brza_prodaja" || !sveObloge) notFound();
    const kopija = uredivacIzKopije(uSpremljeni(izvor), new Map(sveObloge.map((o) => [o.id, o])));
    pocetno = kopija.stanje;
    poruka = `Kopija brze prodaje od ${formatDatum(izvor.potvrden_at ?? izvor.created_at)}: cijene su trenutne.`;
    if (kopija.preskocene.length > 0) {
      poruka += ` Arhivirane obloge su preskočene: ${kopija.preskocene.join(", ")}.`;
    }
  }

  return (
    <UredivacPredracuna
      key={jeKopija ? `kopija-${kopijaId}` : "nova"}
      nacin="brza_prodaja"
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
