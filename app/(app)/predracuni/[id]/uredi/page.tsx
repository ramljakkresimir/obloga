import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { idIzParametra } from "@/lib/data/obloge";
import { dohvatiPostavke } from "@/lib/data/postavke";
import { dohvatiOdabirObloga, dohvatiPredracun, uSpremljeni } from "@/lib/data/predracuni";
import { uredivacIzPredracuna, type SnimakStavke } from "@/lib/predracuni";
import { KosturUredivaca } from "@/components/predracun/Kosturi";
import { UredivacPredracuna } from "@/components/predracun/UredivacPredracuna";

export const metadata: Metadata = { title: "Uredi predračun" };

/** Uređivanje otvorenog predračuna: broj ostaje isti, cijene stavki ostaju snimak (PRD §5.5). */
export default function UrediPredracunPage({ params }: PageProps<"/predracuni/[id]/uredi">) {
  return (
    <Suspense fallback={<KosturUredivaca />}>
      <Uredivac params={params} />
    </Suspense>
  );
}

async function Uredivac({ params }: Pick<PageProps<"/predracuni/[id]/uredi">, "params">) {
  const id = idIzParametra((await params).id);
  const [predracun, { obloge, kategorije }, postavke] = await Promise.all([
    dohvatiPredracun(id),
    dohvatiOdabirObloga(),
    dohvatiPostavke(),
  ]);
  if (!predracun || predracun.vrsta !== "predracun") notFound();
  if (predracun.status !== "otvoren") redirect(`/predracuni/${id}`);

  const snimci: Record<number, SnimakStavke> = Object.fromEntries(
    predracun.stavke.map((s) => [s.artikl_id, { naziv: s.naziv, cijenaKom: s.cijena_kom, m2PoKomadu: s.m2_po_komadu }]),
  );

  return (
    <UredivacPredracuna
      // Nakon spremanja uređivač kreće od svježih podataka.
      key={`${predracun.id}-${predracun.updated_at}`}
      predracunId={predracun.id}
      broj={predracun.broj}
      pocetno={uredivacIzPredracuna(uSpremljeni(predracun))}
      snimciSpremljenih={snimci}
      obloge={obloge}
      kategorije={kategorije}
      pdv={{ uSustavu: predracun.pdv_u_sustavu, cijeneSaPdv: predracun.pdv_cijene_sa_pdv, stopa: predracun.pdv_stopa }}
      zadanaCijenaLjepila={postavke.ljepilo_cijena}
    />
  );
}
