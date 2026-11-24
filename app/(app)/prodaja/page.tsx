import type { Metadata } from "next";
import { Suspense } from "react";
import { Receipt } from "lucide-react";
import { dohvatiProdaje, dohvatiZbrojProdaje } from "@/lib/data/prodaja";
import { graniceUtc, razdobljeIzParametara } from "@/lib/razdoblje";
import { KosturPregleda } from "@/components/prodaja/KosturPregleda";
import { PregledProdaje } from "@/components/prodaja/PregledProdaje";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";

export const metadata: Metadata = { title: "Prodaja" };

/** Pregled prodaje (PRD §5.7, Design §11): razdoblje (Ovaj mjesec zadano), zbroj i lista. */
export default function ProdajaPage({ searchParams }: PageProps<"/prodaja">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Prodaja</h2>
        <GumbPoveznica href="/prodaja/nova" varijanta="naglasni" className="ml-auto">
          <Receipt aria-hidden className="size-5" />
          Brza prodaja
        </GumbPoveznica>
      </div>
      <Suspense fallback={<KosturPregleda />}>
        <Pregled searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Pregled({ searchParams }: Pick<PageProps<"/prodaja">, "searchParams">) {
  const { r, od, do: doDatum } = await searchParams;
  // new Date() tek nakon searchParams (dinamički dio), inače prerender javlja grešku.
  const razdoblje = razdobljeIzParametara({ r, od, do: doDatum }, new Date());
  const granice = graniceUtc(razdoblje);
  const [stranica, zbroj] = await Promise.all([dohvatiProdaje(granice), dohvatiZbrojProdaje(granice)]);

  return <PregledProdaje key={`${razdoblje.od}_${razdoblje.do}`} razdoblje={razdoblje} zbroj={zbroj} pocetno={stranica} />;
}
