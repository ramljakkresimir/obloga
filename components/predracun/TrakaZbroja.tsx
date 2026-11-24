"use client";

import { useId, useState } from "react";
import { ChevronUp } from "lucide-react";
import { formatKM } from "@/lib/format";
import type { IznosiRazrade } from "@/lib/predracuni";
import { Gumb } from "@/components/ui/Gumb";
import { Razrada } from "./Razrada";

type Props = {
  /** null dok nijedna stavka nije ispravna. */
  iznosi: IznosiRazrade | null;
  onSpremi: () => void;
  sprema: boolean;
  /** Tekst gumba (zadano „Spremi predračun"). */
  oznakaGumba?: string;
};

/**
 * Ljepljiva traka na dnu uređivača (mobitel): UKUPNO + Spremi, dodir na zbroj otvara razradu.
 * Na računalu se umjesto nje prikazuje SazetakIznosa u desnom stupcu.
 */
export function TrakaZbroja({ iznosi, onSpremi, sprema, oznakaGumba = "Spremi predračun" }: Props) {
  const [otvorena, setOtvorena] = useState(false);
  const razradaId = useId();

  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-rub bg-povrsina/95 px-4 pt-2 pb-3 shadow-[0_-4px_12px_rgb(49_18_18/0.06)] backdrop-blur lg:hidden">
      {otvorena && iznosi && (
        <div id={razradaId} className="border-b border-rub pt-2 pb-3">
          <Razrada iznosi={iznosi} bezUkupno />
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setOtvorena((o) => !o)}
          disabled={!iznosi}
          aria-expanded={otvorena}
          aria-controls={razradaId}
          className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center rounded-[var(--radius-polje)] text-left disabled:cursor-default"
        >
          <span className="flex items-center gap-1 text-[13px] leading-[18px] font-semibold text-sivosmeda">
            UKUPNO
            {iznosi && (
              <ChevronUp aria-hidden className={`size-4 transition-transform ${otvorena ? "" : "rotate-180"}`} />
            )}
          </span>
          <span className="truncate font-naslov text-xl leading-7 font-bold text-espresso tabular-nums">
            {formatKM(iznosi?.ukupno ?? 0)}
          </span>
          <span className="sr-only">{otvorena ? "Sakrij razradu" : "Prikaži razradu"}</span>
        </button>
        <Gumb ucitavanje={sprema} onClick={onSpremi} className="min-h-12 shrink-0">
          {oznakaGumba}
        </Gumb>
      </div>
    </div>
  );
}

/** Sažetak iznosa u desnom stupcu na računalu (≥ 1024 px). */
export function SazetakIznosa({ iznosi, onSpremi, sprema, oznakaGumba = "Spremi predračun" }: Props) {
  return (
    <aside className="sticky top-8 hidden flex-col gap-4 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)] lg:flex">
      <h3 className="font-naslov text-lg leading-[26px] font-semibold text-espresso">Iznos</h3>
      {iznosi ? (
        <Razrada iznosi={iznosi} />
      ) : (
        <p className="text-sivosmeda">Dodajte oblogu i upišite količinu.</p>
      )}
      <Gumb punaSirina ucitavanje={sprema} onClick={onSpremi} className="min-h-14 text-lg">
        {oznakaGumba}
      </Gumb>
    </aside>
  );
}
