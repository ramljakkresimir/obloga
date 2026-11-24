"use client";

import { RotateCcw } from "lucide-react";
import { formatKM, formatM2 } from "@/lib/format";
import { uPolje, type StanjeUredivaca } from "@/lib/predracuni";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Prekidac } from "@/components/ui/Prekidac";

type Dodaci = Pick<StanjeUredivaca, "ugradnja" | "ljepilo" | "prijevoz">;

type Props = {
  dodaci: Dodaci;
  onPromjena: (dodaci: Partial<Dodaci>) => void;
  /** Prijedlog m² za ugradnju (zbroj m² stavki). */
  predlozeniM2: number;
  /** Zadana cijena ljepila iz Postavki (KM). */
  zadanaCijenaLjepila: number;
  /** Iznosi uključenih dodataka (KM), null dok polja nisu ispravna. */
  iznosi: { ugradnja: number | null; ljepilo: number | null; prijevoz: number | null };
  greska: (kljuc: string, tekstPolja: string) => string | undefined;
  disabled?: boolean;
};

/** Ugradnja, ljepilo i prijevoz (PRD §5.5): svaki ima svoj prekidač i po zadanom je isključen. */
export function Dodaci({ dodaci: d, onPromjena, predlozeniM2, zadanaCijenaLjepila, iznosi, greska, disabled }: Props) {
  const m2Ugradnje = d.ugradnja.rucno ? d.ugradnja.m2 : predlozeniM2 > 0 ? uPolje(predlozeniM2) : "";

  return (
    <div className="flex flex-col divide-y divide-rub">
      <div className="flex flex-col gap-3 pb-3">
        <Prekidac
          oznaka="Ugradnja"
          pomoc={d.ugradnja.ukljucena ? undefined : "m² × cijena po m²"}
          checked={d.ugradnja.ukljucena}
          onChange={(e) => onPromjena({ ugradnja: { ...d.ugradnja, ukljucena: e.target.checked } })}
          disabled={disabled}
        />
        {d.ugradnja.ukljucena && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <BrojPolje
                oznaka="m²"
                jedinica="m²"
                decimalno
                vrijednost={m2Ugradnje}
                onPromjena={(m2) => onPromjena({ ugradnja: { ...d.ugradnja, m2, rucno: true } })}
                greska={greska("ugradnja_m2", m2Ugradnje)}
                disabled={disabled}
              />
              <BrojPolje
                oznaka="Cijena po m²"
                jedinica="KM"
                decimalno
                placeholder="npr. 15"
                vrijednost={d.ugradnja.cijenaM2}
                onPromjena={(cijenaM2) => onPromjena({ ugradnja: { ...d.ugradnja, cijenaM2 } })}
                greska={greska("ugradnja_cijena", d.ugradnja.cijenaM2)}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {d.ugradnja.rucno && predlozeniM2 > 0 && d.ugradnja.m2 !== uPolje(predlozeniM2) ? (
                <button
                  type="button"
                  onClick={() => onPromjena({ ugradnja: { ...d.ugradnja, m2: "", rucno: false } })}
                  disabled={disabled}
                  className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-espresso hover:bg-rub/50"
                >
                  <RotateCcw aria-hidden className="size-4" />
                  Prema stavkama ({formatM2(predlozeniM2)})
                </button>
              ) : (
                <span className="text-sm text-sivosmeda">{d.ugradnja.rucno ? "" : "Predloženo prema stavkama"}</span>
              )}
              <Iznos iznos={iznosi.ugradnja} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 py-3">
        <Prekidac
          oznaka="Ljepilo"
          pomoc={d.ljepilo.ukljuceno ? undefined : "Ne skida stanje"}
          checked={d.ljepilo.ukljuceno}
          onChange={(e) =>
            onPromjena({
              ljepilo: {
                ...d.ljepilo,
                ukljuceno: e.target.checked,
                // Cijena se predlaže iz Postavki pri prvom uključivanju.
                cijena: d.ljepilo.cijena || (zadanaCijenaLjepila > 0 ? uPolje(zadanaCijenaLjepila) : ""),
              },
            })
          }
          disabled={disabled}
        />
        {d.ljepilo.ukljuceno && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <BrojPolje
                oznaka="Komada"
                jedinica="kom"
                placeholder="npr. 4"
                vrijednost={d.ljepilo.kom}
                onPromjena={(kom) => onPromjena({ ljepilo: { ...d.ljepilo, kom } })}
                greska={greska("ljepilo_kom", d.ljepilo.kom)}
                disabled={disabled}
              />
              <BrojPolje
                oznaka="Cijena po komadu"
                jedinica="KM"
                decimalno
                vrijednost={d.ljepilo.cijena}
                onPromjena={(cijena) => onPromjena({ ljepilo: { ...d.ljepilo, cijena } })}
                greska={greska("ljepilo_cijena", d.ljepilo.cijena)}
                disabled={disabled}
              />
            </div>
            <div className="flex justify-end">
              <Iznos iznos={iznosi.ljepilo} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-3">
        <Prekidac
          oznaka="Prijevoz"
          pomoc={d.prijevoz.ukljucen ? undefined : "Fiksni iznos"}
          checked={d.prijevoz.ukljucen}
          onChange={(e) => onPromjena({ prijevoz: { ...d.prijevoz, ukljucen: e.target.checked } })}
          disabled={disabled}
        />
        {d.prijevoz.ukljucen && (
          <BrojPolje
            oznaka="Iznos prijevoza"
            jedinica="KM"
            decimalno
            placeholder="npr. 25"
            vrijednost={d.prijevoz.iznos}
            onPromjena={(iznos) => onPromjena({ prijevoz: { ...d.prijevoz, iznos } })}
            greska={greska("prijevoz", d.prijevoz.iznos)}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function Iznos({ iznos }: { iznos: number | null }) {
  return (
    <span className="ml-auto font-naslov font-semibold text-espresso tabular-nums">
      {iznos === null ? "—" : `= ${formatKM(iznos)}`}
    </span>
  );
}
