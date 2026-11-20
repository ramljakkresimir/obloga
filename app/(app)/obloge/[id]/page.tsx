import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { dohvatiKretanja, dohvatiOblogu, idIzParametra } from "@/lib/data/obloge";
import { formatBroj, formatKM, formatM2 } from "@/lib/format";
import { cijenaPoM2, vrstaStanja } from "@/lib/obloge";
import { VratiIzArhive } from "@/components/obloge/ArhivaObloge";
import { DodajNaStanje } from "@/components/obloge/DodajNaStanje";
import { PovijestKretanja } from "@/components/obloge/PovijestKretanja";
import { SlikaObloge } from "@/components/obloge/SlikaObloge";
import { GumbPoveznica } from "@/components/ui/GumbPoveznica";
import { Kartica } from "@/components/ui/Kartica";
import { OznakaStanja } from "@/components/ui/OznakaStatusa";
import { Poruka } from "@/components/ui/Poruka";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Obloga" };

export default function OblogaPage({ params }: PageProps<"/obloge/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <Link
        href="/obloge"
        className="hidden min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso lg:inline-flex"
      >
        <ArrowLeft aria-hidden className="size-5" />
        Obloge
      </Link>
      <Suspense fallback={<KosturDetalja />}>
        <Detalji params={params} />
      </Suspense>
    </div>
  );
}

async function Detalji({ params }: Pick<PageProps<"/obloge/[id]">, "params">) {
  const id = idIzParametra((await params).id);
  const [obloga, povijest] = await Promise.all([dohvatiOblogu(id), dohvatiKretanja(id)]);
  if (!obloga) notFound();

  const vrsta = vrstaStanja(obloga.stanje, obloga.min_stanje);
  const poM2 = cijenaPoM2(obloga.cijena_kom, obloga.m2_po_komadu);
  const dimenzije =
    obloga.sirina_cm && obloga.duzina_cm ? `${formatBroj(obloga.sirina_cm)} × ${formatBroj(obloga.duzina_cm)} cm` : null;
  const povrsina = obloga.m2_po_komadu ? `${formatBroj(obloga.m2_po_komadu, 4)} m²/kom` : null;

  return (
    <>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="relative -mx-4 -mt-4 aspect-[4/3] overflow-hidden bg-povrsina lg:mx-0 lg:mt-0 lg:rounded-[var(--radius-kartica)] lg:border lg:border-rub">
          <SlikaObloge
            slika={obloga.slika}
            naziv={obloga.naziv}
            prikaz="contain"
            sizes="(min-width: 1024px) 450px, 100vw"
            priority
            velikiInicijali
          />
        </div>

        <div className="flex flex-col gap-4">
          {!obloga.aktivan && (
            <div className="flex flex-col gap-3">
              <Poruka vrsta="info">Obloga je arhivirana i ne prikazuje se na listi ni u odabiru.</Poruka>
              <VratiIzArhive oblogaId={obloga.id} className="self-start" />
            </div>
          )}

          <div>
            <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">{obloga.naziv}</h2>
            {obloga.kategorija && <p className="text-sivosmeda">{obloga.kategorija}</p>}
          </div>

          <dl className="flex flex-col gap-1 tabular-nums">
            {(dimenzije || povrsina) && (
              <div>
                <dt className="sr-only">Dimenzije</dt>
                <dd>{[dimenzije, povrsina].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
            <div>
              <dt className="sr-only">Cijena</dt>
              <dd className="font-semibold">
                {formatKM(obloga.cijena_kom)}/kom
                {poM2 !== null && <span className="font-normal text-sivosmeda"> · {formatKM(poM2)}/m²</span>}
              </dd>
            </div>
          </dl>

          <Kartica>
            <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda">Stanje</p>
            <p
              className={`font-naslov text-[32px] leading-10 font-bold tabular-nums ${
                obloga.stanje < 0 ? "text-greska" : "text-espresso"
              }`}
            >
              {obloga.stanje < 0 ? "−" : ""}
              {Math.abs(obloga.stanje)} kom
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-sivosmeda tabular-nums">
              {obloga.m2_po_komadu && obloga.stanje > 0 && <span>≈ {formatM2(obloga.stanje * obloga.m2_po_komadu)}</span>}
              {vrsta && <OznakaStanja vrsta={vrsta} kom={obloga.stanje} />}
              <span>Min. stanje: {obloga.min_stanje} kom</span>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <DodajNaStanje oblogaId={obloga.id} naziv={obloga.naziv} />
              <GumbPoveznica href={`/obloge/${obloga.id}/uredi`} varijanta="sekundarni" punaSirina>
                <Pencil aria-hidden className="size-5" />
                Uredi
              </GumbPoveznica>
            </div>
          </Kartica>
        </div>
      </div>

      <Kartica naslov="Povijest kretanja">
        <PovijestKretanja key={povijest.kretanja[0]?.id ?? 0} artiklId={obloga.id} pocetno={povijest} />
      </Kartica>
    </>
  );
}

function KosturDetalja() {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
      <Skeleton className="-mx-4 -mt-4 aspect-[4/3] rounded-none lg:mx-0 lg:mt-0 lg:rounded-[var(--radius-kartica)]" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-kartica)]" />
      </div>
    </div>
  );
}
