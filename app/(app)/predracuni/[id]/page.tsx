import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, FileText, MapPin, Phone, User } from "lucide-react";
import { idIzParametra } from "@/lib/data/obloge";
import { dohvatiPostavke } from "@/lib/data/postavke";
import { dohvatiPredracun, type PredracunDetalji } from "@/lib/data/predracuni";
import { brojSImenicom, formatDatum, formatKM, formatM2, OBLIK_DAN } from "@/lib/format";
import { modelPdf } from "@/lib/pdf";
import { iznosiSpremljenog } from "@/lib/predracuni";
import { AkcijePredracuna } from "@/components/predracun/AkcijePredracuna";
import { KosturDetalja } from "@/components/predracun/Kosturi";
import { Razrada } from "@/components/predracun/Razrada";
import { StavkeDetalja } from "@/components/predracun/StavkeDetalja";
import { Kartica } from "@/components/ui/Kartica";
import { OznakaStatusa } from "@/components/ui/OznakaStatusa";

export const metadata: Metadata = { title: "Predračun" };

export default function PredracunPage({ params }: PageProps<"/predracuni/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        href="/predracuni"
        className="hidden min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso lg:inline-flex"
      >
        <ArrowLeft aria-hidden className="size-5" />
        Predračuni
      </Link>
      <Suspense fallback={<KosturDetalja />}>
        <Detalji params={params} />
      </Suspense>
    </div>
  );
}

async function Detalji({ params }: Pick<PageProps<"/predracuni/[id]">, "params">) {
  const id = idIzParametra((await params).id);
  const [p, postavke] = await Promise.all([dohvatiPredracun(id), dohvatiPostavke()]);
  // Brze prodaje imaju svoj prikaz u Prodaji.
  if (!p || p.vrsta !== "predracun" || !p.broj) notFound();

  const iznosi = iznosiSpremljenog(p);

  return (
    <>
      <Zaglavlje p={p} />
      <Kupac p={p} />

      <Kartica naslov="Obloge">
        <StavkeDetalja stavke={p.stavke} />
      </Kartica>

      {(p.ugradnja_m2 !== null || p.ljepilo_kom !== null || p.prijevoz !== null) && (
        <Kartica naslov="Dodaci">
          <dl className="flex flex-col gap-2 tabular-nums">
            {p.ugradnja_m2 !== null && (
              <Dodatak
                naziv="Ugradnja"
                opis={`${formatM2(p.ugradnja_m2)} × ${formatKM(p.ugradnja_cijena_m2 ?? 0)}/m²`}
                iznos={iznosi.ugradnja}
              />
            )}
            {p.ljepilo_kom !== null && (
              <Dodatak
                naziv="Ljepilo"
                opis={`${p.ljepilo_kom} kom × ${formatKM(p.ljepilo_cijena ?? 0)}`}
                iznos={iznosi.ljepilo}
              />
            )}
            {p.prijevoz !== null && <Dodatak naziv="Prijevoz" iznos={iznosi.prijevoz} />}
          </dl>
        </Kartica>
      )}

      <Kartica naslov="Iznos">
        <Razrada iznosi={iznosi} />
      </Kartica>

      <Uvjeti p={p} />

      {p.napomena && (
        <Kartica naslov="Interna napomena">
          <p className="whitespace-pre-wrap">{p.napomena}</p>
        </Kartica>
      )}

      <AkcijePredracuna
        id={p.id}
        broj={p.broj}
        status={p.status}
        stavke={p.stavke.map((s) => ({ artiklId: s.artikl_id, naziv: s.naziv, komada: s.komada, stanje: s.stanje }))}
        pdf={modelPdf(p, postavke)}
      />
    </>
  );
}

function Zaglavlje({ p }: { p: PredracunDetalji }) {
  const detalji = [`Napravljen ${formatDatum(p.created_at)}`, p.vlasnik].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso tabular-nums">{p.broj}</h2>
        <OznakaStatusa status={p.status} />
      </div>
      <p className="text-sivosmeda">{detalji}</p>
      {p.potvrden_at && (
        <p className={p.status === "storniran" ? "text-sivosmeda" : "font-semibold text-uspjeh"}>
          Potvrđen {formatDatum(p.potvrden_at)}
        </p>
      )}
      {p.storniran_at && <p className="font-semibold text-greska">Storniran {formatDatum(p.storniran_at)}</p>}
      {p.kopija && (
        <p className="text-sm text-sivosmeda">
          Kopija predračuna{" "}
          <Link href={`/predracuni/${p.kopija.id}`} className="font-semibold text-espresso underline underline-offset-4">
            {p.kopija.broj}
          </Link>
        </p>
      )}
    </div>
  );
}

function Kupac({ p }: { p: PredracunDetalji }) {
  const adresa = [p.kupac_adresa, p.kupac_mjesto].filter(Boolean).join(", ");
  if (!p.kupac_ime && !p.kupac_telefon && !adresa && !p.kupac_jib) {
    return (
      <Kartica naslov="Kupac">
        <p className="text-sivosmeda">Kupac nije upisan.</p>
      </Kartica>
    );
  }
  return (
    <Kartica naslov="Kupac">
      <ul className="flex flex-col gap-2">
        {p.kupac_ime && (
          <li className="flex items-center gap-3 font-semibold">
            <User aria-hidden className="size-5 shrink-0 text-drvo" />
            {p.kupac_ime}
          </li>
        )}
        {p.kupac_telefon && (
          <li>
            <a
              href={`tel:${p.kupac_telefon.replace(/[^\d+]/g, "")}`}
              className="-my-2 inline-flex min-h-12 items-center gap-3 font-semibold text-espresso underline decoration-rub underline-offset-4 hover:decoration-espresso"
            >
              <Phone aria-hidden className="size-5 shrink-0 text-drvo" />
              {p.kupac_telefon}
            </a>
          </li>
        )}
        {adresa && (
          <li className="flex items-center gap-3">
            <MapPin aria-hidden className="size-5 shrink-0 text-drvo" />
            {adresa}
          </li>
        )}
        {p.kupac_jib && (
          <li className="flex items-center gap-3 tabular-nums">
            <FileText aria-hidden className="size-5 shrink-0 text-drvo" />
            JIB {p.kupac_jib}
          </li>
        )}
      </ul>
    </Kartica>
  );
}

/** Uvjeti s PDF-a (način plaćanja, rok, isporuka, svrha); prazni se ne prikazuju. */
function Uvjeti({ p }: { p: PredracunDetalji }) {
  const redovi = [
    ["Način plaćanja", p.nacin_placanja],
    ["Vrijedi", p.vrijedi_dana ? brojSImenicom(p.vrijedi_dana, OBLIK_DAN) : null],
    ["Datum isporuke", p.datum_isporuke ? formatDatum(p.datum_isporuke) : null],
    ["Svrha", p.svrha],
  ].filter((r): r is [string, string] => Boolean(r[1]));
  if (redovi.length === 0) return null;
  return (
    <Kartica naslov="Uvjeti">
      <dl className="flex flex-col gap-2">
        {redovi.map(([naziv, vrijednost]) => (
          <div key={naziv} className="flex items-baseline justify-between gap-3">
            <dt className="text-sivosmeda">{naziv}</dt>
            <dd className="text-right font-semibold">{vrijednost}</dd>
          </div>
        ))}
      </dl>
    </Kartica>
  );
}

function Dodatak({ naziv, opis, iznos }: { naziv: string; opis?: string; iznos: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt>
        <span className="font-semibold">{naziv}</span>
        {opis && <span className="block text-sm text-sivosmeda">{opis}</span>}
      </dt>
      <dd className="font-naslov font-semibold text-espresso">{iznos === null ? "—" : formatKM(iznos)}</dd>
    </div>
  );
}
