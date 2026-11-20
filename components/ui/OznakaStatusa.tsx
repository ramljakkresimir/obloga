import type { Enums } from "@/utils/supabase/types";

export type StatusPredracuna = Enums<"status_predracuna">;

const statusi: Record<StatusPredracuna, { naziv: string; stil: string }> = {
  otvoren: { naziv: "Otvoren", stil: "bg-[#fdf1dc] text-[#8a5300]" },
  potvrden: { naziv: "Potvrđen", stil: "bg-[#e3f1e8] text-uspjeh" },
  odbijen: { naziv: "Odbijen", stil: "bg-[#eeeae6] text-sivosmeda" },
  storniran: { naziv: "Storniran", stil: "bg-greska-pozadina text-greska" },
};

const oznaka = "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[13px] leading-[18px] font-semibold whitespace-nowrap";

/** Oznaka statusa predračuna (boja + tekst). */
export function OznakaStatusa({ status, className = "" }: { status: StatusPredracuna; className?: string }) {
  const { naziv, stil } = statusi[status];
  return <span className={`${oznaka} ${stil} ${className}`}>{naziv}</span>;
}

export type VrstaStanja = "nisko" | "minus" | "nema";

const stanja: Record<VrstaStanja, { naziv: string; tocka: string; stil: string }> = {
  nisko: { naziv: "Nisko", tocka: "bg-jantar", stil: "bg-[#fdf1dc] text-[#8a5300]" },
  minus: { naziv: "Minus", tocka: "bg-greska", stil: "bg-greska-pozadina text-greska" },
  nema: { naziv: "Nema", tocka: "bg-sivosmeda", stil: "bg-[#eeeae6] text-sivosmeda" },
};

/** Oznaka stanja obloge: točka + tekst, npr. „Nisko · 3 kom", „Minus · −8 kom". */
export function OznakaStanja({ vrsta, kom, className = "" }: { vrsta: VrstaStanja; kom: number; className?: string }) {
  const { naziv, tocka, stil } = stanja[vrsta];
  const komada = `${kom < 0 ? "−" : ""}${Math.abs(kom)} kom`;
  return (
    <span className={`${oznaka} ${stil} ${className}`}>
      <span aria-hidden className={`size-2 rounded-full ${tocka}`} />
      {naziv} · <span className="tabular-nums">{komada}</span>
    </span>
  );
}
