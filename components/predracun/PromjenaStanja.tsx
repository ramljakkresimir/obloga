import { TriangleAlert } from "lucide-react";
import type { Manjak } from "@/lib/predracuni";

/**
 * Popis obloga s promjenom stanja u donjem listu potvrde ili storna:
 * −N kom (skida se, crveno) ili +N kom (vraća se, zeleno).
 */
export function ListaPromjene({
  stavke,
  smjer,
}: {
  stavke: { artiklId: number; naziv: string; komada: number }[];
  smjer: "skida" | "vraca";
}) {
  return (
    <ul className="flex flex-col gap-1 tabular-nums">
      {stavke.map((s) => (
        <li key={s.artiklId} className="flex justify-between gap-3">
          <span className="min-w-0">{s.naziv}</span>
          <span className={`shrink-0 font-semibold ${smjer === "skida" ? "text-greska" : "text-uspjeh"}`}>
            {smjer === "skida" ? "−" : "+"}
            {s.komada} kom
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Upozorenje o manjku prije skidanja sa stanja (PRD §5.5 Potvrda). Bez manjka ne prikazuje ništa. */
export function UpozorenjeManjka({
  nedostaje,
  napomena = "Stanje će otići u minus.",
}: {
  nedostaje: Manjak[];
  /** Rečenica ispod popisa (spremanje predračuna ne mijenja stanje, potvrda mijenja). */
  napomena?: string;
}) {
  if (nedostaje.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-polje)] bg-greska-pozadina px-4 py-3 text-greska">
      <p className="flex items-center gap-2 font-semibold">
        <TriangleAlert aria-hidden className="size-5 shrink-0" />
        Nema dovoljno na stanju
      </p>
      <ul className="flex flex-col gap-1 text-sm tabular-nums">
        {nedostaje.map((m) => (
          <li key={m.artiklId}>
            {m.naziv} – treba {m.treba}, ima {m.ima}, <span className="font-semibold">nedostaje {m.nedostaje} kom</span>
          </li>
        ))}
      </ul>
      <p className="text-sm">{napomena}</p>
    </div>
  );
}
