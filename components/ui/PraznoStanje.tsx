import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  naslov: string;
  opis?: string;
  ikona?: LucideIcon;
  /** Npr. <Gumb> ili <Link> za glavnu akciju („Dodaj prvu oblogu"). */
  akcija?: ReactNode;
};

/** Prazno stanje liste: motiv trake od 5 boja, kratka poruka i po želji akcija. */
export function PraznoStanje({ naslov, opis, ikona: Ikona, akcija }: Props) {
  return (
    <section className="flex flex-col items-center gap-3 overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina pb-8 text-center shadow-[var(--shadow-kartica)]">
      <div className="traka-brenda w-full" aria-hidden />
      {Ikona && <Ikona aria-hidden className="mt-4 size-8 text-drvo" />}
      <h3 className={`font-naslov text-lg font-semibold text-espresso ${Ikona ? "" : "mt-6"}`}>{naslov}</h3>
      {opis && <p className="max-w-sm px-4 text-sivosmeda">{opis}</p>}
      {akcija && <div className="mt-2">{akcija}</div>}
    </section>
  );
}
