import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { idIzParametra } from "@/lib/data/obloge";
import { dohvatiPredracun, type PredracunDetalji } from "@/lib/data/predracuni";
import { formatDatum } from "@/lib/format";
import { iznosiSpremljenog } from "@/lib/predracuni";
import { KosturDetalja } from "@/components/predracun/Kosturi";
import { Razrada } from "@/components/predracun/Razrada";
import { StavkeDetalja } from "@/components/predracun/StavkeDetalja";
import { AkcijeBrzeProdaje } from "@/components/prodaja/AkcijeBrzeProdaje";
import { Kartica } from "@/components/ui/Kartica";
import { OznakaStatusa } from "@/components/ui/OznakaStatusa";

export const metadata: Metadata = { title: "Brza prodaja" };

/** Detalji brze prodaje (PRD §5.6): stavke, iznos, napomena, Storniraj i Kopiraj. */
export default function BrzaProdajaDetaljiPage({ params }: PageProps<"/prodaja/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        href="/prodaja"
        className="hidden min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso lg:inline-flex"
      >
        <ArrowLeft aria-hidden className="size-5" />
        Prodaja
      </Link>
      <Suspense fallback={<KosturDetalja />}>
        <Detalji params={params} />
      </Suspense>
    </div>
  );
}

async function Detalji({ params }: Pick<PageProps<"/prodaja/[id]">, "params">) {
  const id = idIzParametra((await params).id);
  const p = await dohvatiPredracun(id);
  // Predračuni imaju svoj prikaz u Predračunima.
  if (!p || p.vrsta !== "brza_prodaja") notFound();

  return (
    <>
      <Zaglavlje p={p} />

      <Kartica naslov="Obloge">
        <StavkeDetalja stavke={p.stavke} />
      </Kartica>

      <Kartica naslov="Iznos">
        <Razrada iznosi={iznosiSpremljenog(p)} />
      </Kartica>

      {p.napomena && (
        <Kartica naslov="Interna napomena">
          <p className="whitespace-pre-wrap">{p.napomena}</p>
        </Kartica>
      )}

      <AkcijeBrzeProdaje
        id={p.id}
        status={p.status}
        stavke={p.stavke.map((s) => ({ artiklId: s.artikl_id, naziv: s.naziv, komada: s.komada }))}
      />
    </>
  );
}

function Zaglavlje({ p }: { p: PredracunDetalji }) {
  const detalji = [formatDatum(p.potvrden_at ?? p.created_at), p.vlasnik].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">Brza prodaja</h2>
        <OznakaStatusa status={p.status} />
      </div>
      <p className="text-sivosmeda">{detalji}</p>
      {p.storniran_at && <p className="font-semibold text-greska">Stornirana {formatDatum(p.storniran_at)}</p>}
    </div>
  );
}
