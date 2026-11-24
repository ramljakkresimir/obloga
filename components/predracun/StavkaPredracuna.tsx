"use client";

import { Trash2 } from "lucide-react";
import type { StavkaRezultat } from "@/lib/kalkulacija";
import { fenUKm } from "@/lib/kalkulacija";
import { formatKM, formatM2 } from "@/lib/format";
import { uPolje, type StavkaUredivaca } from "@/lib/predracuni";
import { SlikaObloge } from "@/components/obloge/SlikaObloge";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Segment } from "@/components/ui/Segment";

type Props = {
  stavka: StavkaUredivaca;
  /** Izračun stavke; null dok količina nije ispravno upisana. */
  rezultat: StavkaRezultat | null;
  greska?: string;
  onPromjena: (stavka: StavkaUredivaca) => void;
  onUkloni: () => void;
  disabled?: boolean;
};

/**
 * Stavka u uređivaču: sličica, naziv, cijena/kom, prekidač m² | kom, količina i izračun ispod
 * („= 28 kom · 12,54 m² · 616,00 KM"). Polje količine ima data-kolicina={artiklId} za fokus nakon dodavanja.
 */
export function StavkaPredracuna({ stavka: s, rezultat, greska, onPromjena, onUkloni, disabled }: Props) {
  const imaM2 = s.m2PoKomadu != null;

  /** Kod promjene jedinice količina se pretvara (12,5 m² → 28 kom; 28 kom → 12,54 m²). */
  function promijeniJedinicu(unos: "m2" | "kom") {
    if (unos === s.unos) return;
    let kolicina = "";
    if (rezultat) {
      if (unos === "kom") kolicina = String(rezultat.komada);
      else if (rezultat.m2 !== null) kolicina = uPolje(Math.round(rezultat.m2 * 100) / 100);
    }
    onPromjena({ ...s, unos, kolicina });
  }

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-rub">
          <SlikaObloge slika={s.slika} naziv={s.naziv} sizes="56px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 leading-snug font-semibold text-tekst">{s.naziv}</p>
          <p className="text-sm text-sivosmeda tabular-nums">{formatKM(s.cijenaKom)}/kom</p>
        </div>
        <button
          type="button"
          onClick={onUkloni}
          disabled={disabled}
          aria-label={`Ukloni ${s.naziv}`}
          className="-mt-2 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-sivosmeda hover:bg-greska-pozadina hover:text-greska disabled:opacity-60"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>

      <div className="flex items-start gap-2">
        <Segment
          oznaka={`Jedinica: ${s.naziv}`}
          opcije={[
            { vrijednost: "m2", naziv: "m²", onemogucena: !imaM2 },
            { vrijednost: "kom", naziv: "kom" },
          ]}
          vrijednost={s.unos}
          onPromjena={promijeniJedinicu}
          disabled={disabled}
        />
        <BrojPolje
          oznaka={`Količina: ${s.naziv}`}
          skrivenaOznaka
          jedinica={s.unos === "m2" ? "m²" : "kom"}
          decimalno={s.unos === "m2"}
          placeholder={s.unos === "m2" ? "m²" : "komada"}
          vrijednost={s.kolicina}
          onPromjena={(kolicina) => onPromjena({ ...s, kolicina })}
          disabled={disabled}
          greska={greska}
          className="min-w-0 flex-1"
          data-kolicina={s.artiklId}
        />
      </div>

      <p className="text-sm text-sivosmeda tabular-nums" aria-live="polite">
        {rezultat ? (
          <>
            = <span className="font-semibold text-espresso">{rezultat.komada} kom</span>
            {rezultat.m2 !== null && <> · {formatM2(rezultat.m2)}</>}
            {" · "}
            <span className="font-semibold text-espresso">{formatKM(fenUKm(rezultat.iznosFen))}</span>
          </>
        ) : !imaM2 ? (
          "Obloga nema m² po komadu, unosi se u komadima."
        ) : (
          "Upišite količinu u m² ili komadima."
        )}
      </p>
    </li>
  );
}
