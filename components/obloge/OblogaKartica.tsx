import Link from "next/link";
import type { Obloga } from "@/lib/data/obloge";
import { formatM2 } from "@/lib/format";
import { vrstaStanja } from "@/lib/obloge";
import { OznakaStanja } from "@/components/ui/OznakaStatusa";
import { SlikaObloge } from "./SlikaObloge";

/** Kartica obloge u mreži: slika 1:1, naziv (najviše 2 retka), stanje i oznaka u kutu slike. */
const SIZES_MREZE = "(min-width: 1280px) 220px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function OblogaKartica({
  obloga,
  prioritet,
  sizes = SIZES_MREZE,
}: {
  obloga: Obloga;
  prioritet?: boolean;
  /** `sizes` slike; zadano za mrežu na listi obloga. */
  sizes?: string;
}) {
  const vrsta = vrstaStanja(obloga.stanje, obloga.min_stanje);
  const m2 = obloga.m2_po_komadu && obloga.stanje > 0 ? obloga.stanje * obloga.m2_po_komadu : null;

  return (
    <Link
      href={`/obloge/${obloga.id}`}
      className={`group flex w-full flex-col overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina shadow-[var(--shadow-kartica)] transition-shadow hover:shadow-[0_2px_4px_rgb(49_18_18/0.08),0_8px_20px_rgb(49_18_18/0.1)] ${
        obloga.aktivan ? "" : "opacity-60"
      }`}
    >
      <div className="relative aspect-square">
        <SlikaObloge
          slika={obloga.slika}
          naziv={obloga.naziv}
          sizes={sizes}
          priority={prioritet}
        />
        {vrsta && <OznakaStanja vrsta={vrsta} kom={obloga.stanje} className="absolute top-2 left-2 shadow-sm" />}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 leading-snug font-semibold text-tekst">{obloga.naziv}</h3>
        <p className="mt-auto text-sm text-sivosmeda tabular-nums">
          <span className={`font-naslov font-semibold ${obloga.stanje < 0 ? "text-greska" : "text-espresso"}`}>
            {obloga.stanje < 0 ? "−" : ""}
            {Math.abs(obloga.stanje)} kom
          </span>
          {m2 !== null && <> · ≈ {formatM2(m2)}</>}
        </p>
      </div>
    </Link>
  );
}
