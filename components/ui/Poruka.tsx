import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

type Vrsta = "greska" | "uspjeh" | "info";

const stilovi: Record<Vrsta, string> = {
  greska: "bg-greska-pozadina text-greska",
  uspjeh: "bg-[#e3f1e8] text-uspjeh",
  info: "bg-pijesak-svijetli text-espresso",
};

const ikone = { greska: CircleAlert, uspjeh: CircleCheck, info: Info };

/** Obavijest unutar forme. Uvijek ima tekst, ne samo boju. */
export function Poruka({ vrsta, children }: { vrsta: Vrsta; children: ReactNode }) {
  const Ikona = ikone[vrsta];
  return (
    <div
      role={vrsta === "greska" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-[var(--radius-polje)] px-4 py-3 text-sm font-semibold ${stilovi[vrsta]}`}
    >
      <Ikona aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
