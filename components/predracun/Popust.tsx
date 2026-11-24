"use client";

import { formatKM } from "@/lib/format";
import type { StanjeUredivaca } from "@/lib/predracuni";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Poruka } from "@/components/ui/Poruka";
import { Segment } from "@/components/ui/Segment";

type Props = {
  popust: StanjeUredivaca["popust"];
  onPromjena: (popust: StanjeUredivaca["popust"]) => void;
  /** Izračunati popust u KM (0 = bez popusta). */
  iznos: number;
  /** Traženi popust je veći od međuzbroja pa je smanjen na međuzbroj. */
  ogranicen: boolean;
  greska?: string;
  disabled?: boolean;
};

/** Popust na ukupan iznos (međuzbroj), u % ili KM (PRD §6.2). Prazno polje = bez popusta. */
export function Popust({ popust, onPromjena, iznos, ogranicen, greska, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Segment
          oznaka="Vrsta popusta"
          opcije={[
            { vrijednost: "posto", naziv: "%" },
            { vrijednost: "km", naziv: "KM" },
          ]}
          vrijednost={popust.tip}
          onPromjena={(tip) => onPromjena({ ...popust, tip })}
          disabled={disabled}
        />
        <BrojPolje
          oznaka="Popust"
          skrivenaOznaka
          jedinica={popust.tip === "posto" ? "%" : "KM"}
          decimalno
          placeholder="bez popusta"
          vrijednost={popust.vrijednost}
          onPromjena={(vrijednost) => onPromjena({ ...popust, vrijednost })}
          greska={greska}
          disabled={disabled}
          className="min-w-0 flex-1"
        />
      </div>
      {iznos > 0 && (
        <p className="text-right font-naslov font-semibold text-uspjeh tabular-nums">−{formatKM(iznos)}</p>
      )}
      {ogranicen && <Poruka vrsta="info">Popust je veći od iznosa pa je smanjen na cijeli međuzbroj.</Poruka>}
    </div>
  );
}
