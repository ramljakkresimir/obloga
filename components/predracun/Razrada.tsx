import { formatBroj, formatKM } from "@/lib/format";
import type { IznosiRazrade } from "@/lib/predracuni";

export type { IznosiRazrade };

/**
 * Razrada iznosa (PRD §6.2): obloge, dodaci, međuzbroj, popust, PDV, ukupno. Svi iznosi u KM.
 * Bez hookova, pa radi i u uređivaču (client) i na detaljima (server).
 */
export function Razrada({ iznosi: r, bezUkupno }: { iznosi: IznosiRazrade; bezUkupno?: boolean }) {
  const imaDodataka = r.ugradnja !== null || r.ljepilo !== null || r.prijevoz !== null;
  const nakonPopusta = r.medjuzbroj - r.popust;

  return (
    <dl className="flex flex-col gap-1.5 tabular-nums">
      <Red naziv="Obloge" iznos={r.stavke} />
      {r.popustStavki > 0 && (
        <div className="-mt-1 flex items-baseline justify-between gap-3 text-sm text-sivosmeda">
          <dt>od toga popust na stavke</dt>
          <dd className="text-uspjeh">{formatKM(-r.popustStavki)}</dd>
        </div>
      )}
      {r.ugradnja !== null && <Red naziv="Ugradnja" iznos={r.ugradnja} />}
      {r.ljepilo !== null && <Red naziv="Ljepilo" iznos={r.ljepilo} />}
      {r.prijevoz !== null && <Red naziv="Prijevoz" iznos={r.prijevoz} />}
      {(imaDodataka || r.popust > 0) && <Red naziv="Međuzbroj" iznos={r.medjuzbroj} istaknuto />}
      {r.popust > 0 && (
        <>
          <Red
            naziv={`${r.popustStavki > 0 ? "Ukupni popust" : "Popust"}${r.popustPosto !== null ? ` ${formatBroj(r.popustPosto)} %` : ""}`}
            iznos={-r.popust}
          />
          {r.uSustavuPdv && <Red naziv="Iznos nakon popusta" iznos={nakonPopusta} />}
        </>
      )}
      {r.uSustavuPdv && (
        <>
          <Red naziv="Osnovica" iznos={r.osnovica} />
          <Red naziv={`PDV ${formatBroj(r.pdvStopa)} %`} iznos={r.pdv} />
        </>
      )}
      {!bezUkupno && (
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-rub pt-2">
          <dt className="font-naslov font-semibold text-espresso">UKUPNO</dt>
          <dd className="font-naslov text-xl font-bold text-espresso">{formatKM(r.ukupno)}</dd>
        </div>
      )}
    </dl>
  );
}

function Red({ naziv, iznos, istaknuto }: { naziv: string; iznos: number; istaknuto?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${istaknuto ? "font-semibold text-tekst" : "text-sivosmeda"}`}>
      <dt>{naziv}</dt>
      <dd className={iznos < 0 ? "text-uspjeh" : "text-tekst"}>{formatKM(iznos)}</dd>
    </div>
  );
}
