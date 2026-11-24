import Link from "next/link";
import type { StavkaDetalja } from "@/lib/data/predracuni";
import { formatKM, formatM2 } from "@/lib/format";
import { SlikaObloge } from "@/components/obloge/SlikaObloge";

/** Stavke spremljenog predračuna ili brze prodaje: slika, naziv, kom (m²) × cijena, iznos. */
export function StavkeDetalja({ stavke }: { stavke: StavkaDetalja[] }) {
  return (
    <ul className="-my-3 divide-y divide-rub">
      {stavke.map((s) => (
        <li key={s.id} className="flex items-start gap-3 py-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-rub">
            <SlikaObloge slika={s.slika} naziv={s.naziv} sizes="48px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 leading-snug font-semibold text-tekst">
              {s.aktivan ? (
                <Link
                  href={`/obloge/${s.artikl_id}`}
                  className="underline decoration-transparent underline-offset-4 hover:decoration-espresso"
                >
                  {s.naziv}
                </Link>
              ) : (
                s.naziv
              )}
            </p>
            <p className="text-sm text-sivosmeda tabular-nums">
              {s.komada} kom{s.unos === "m2" && s.unesena_m2 !== null && <> ({formatM2(s.unesena_m2)})</>} ×{" "}
              {formatKM(s.cijena_kom)}
            </p>
          </div>
          <p className="shrink-0 font-naslov font-semibold text-espresso tabular-nums">{formatKM(s.iznos)}</p>
        </li>
      ))}
    </ul>
  );
}
