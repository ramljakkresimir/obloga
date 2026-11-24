// Model PDF predračuna (PRD §5.5, Design.md › PDF predračun). Čiste funkcije bez Reacta:
// server gradi model, a preglednik ga samo iscrtava (components/pdf/PredracunPdf.tsx).

import { formatBroj, formatDatum, formatKM, formatM2 } from "./format";
import { iznosiSpremljenog, type SpremljeniPredracun } from "./predracuni";
import type { Tables } from "@/utils/supabase/types";

/** Puni logo za zaglavlje PDF-a (public/). */
export const LOGO_PDF = "/slike/logo/logoNoBackground.png";

/** Podaci firme iz postavki koji idu na PDF. */
export type FirmaPdf = Pick<Tables<"postavke">, "naziv_firme" | "adresa" | "mjesto" | "telefon" | "email" | "jib" | "pdv_broj">;

/** Spremljeni predračun s poljima koja PDF treba (podskup PredracunDetalji). */
export type PredracunZaPdf = Omit<SpremljeniPredracun, "stavke"> &
  Pick<
    Tables<"predracuni">,
    | "broj"
    | "updated_at"
    | "pdv_u_sustavu"
    | "pdv_cijene_sa_pdv"
    | "pdv_stopa"
    | "medjuzbroj"
    | "popust_iznos"
    | "osnovica"
    | "pdv_iznos"
    | "ukupno"
  > & { stavke: (SpremljeniPredracun["stavke"][number] & { iznos: number })[] };

export type RedakPdf = { rb: number; opis: string; kolicina: string; cijena: string; iznos: string };
export type RedSazetka = { naziv: string; iznos: string; istaknuto?: boolean };

/** Sve što PDF prikazuje, već formatirano (plain objekt, prolazi server → client). */
export type PredracunPdf = {
  broj: string;
  datum: string;
  imeDatoteke: string;
  tekstPoruke: string;
  firma: { naziv: string; retci: string[] };
  /** Upisani podaci kupca (ime, telefon, mjesto); prazno = kupac nije upisan. */
  kupac: string[];
  retci: RedakPdf[];
  /** Redovi iznad trake UKUPNO (prazno kad nema popusta ni PDV-a). */
  sazetak: RedSazetka[];
  ukupno: string;
  podnozje: string;
};

/** "PR-2026-001" → "Predracun-PR-2026-001.pdf" (bez dijakritika i čudnih znakova u imenu). */
export function imeDatoteke(broj: string): string {
  return `Predracun-${broj.replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
}

/** Tekst koji uz PDF ide u Viber / WhatsApp / mail. */
export function tekstPoruke(broj: string, nazivFirme: string): string {
  return `Poštovani, u privitku je predračun ${broj}.\n${nazivFirme}`;
}

const neprazno = (...dijelovi: (string | null | undefined)[]) =>
  dijelovi.map((d) => d?.trim()).filter((d): d is string => Boolean(d));

/**
 * Spremljeni predračun + podaci firme → model PDF-a. Iznosi su oni spremljeni u bazi.
 * Interna napomena namjerno nije u modelu (ne ide na PDF).
 */
export function modelPdf(p: PredracunZaPdf, firma: FirmaPdf): PredracunPdf {
  if (!p.broj) throw new Error("Predračun nema broj.");
  const r = iznosiSpremljenog(p);

  const retci: Omit<RedakPdf, "rb">[] = p.stavke.map((s) => ({
    opis: s.naziv,
    kolicina: `${s.komada} kom${s.unos === "m2" && s.unesena_m2 !== null ? ` (${formatM2(s.unesena_m2)})` : ""}`,
    cijena: formatKM(s.cijena_kom),
    iznos: formatKM(s.iznos),
  }));
  if (p.ugradnja_m2 !== null && r.ugradnja !== null) {
    retci.push({
      opis: "Ugradnja",
      kolicina: formatM2(p.ugradnja_m2),
      cijena: formatKM(p.ugradnja_cijena_m2 ?? 0),
      iznos: formatKM(r.ugradnja),
    });
  }
  if (p.ljepilo_kom !== null && r.ljepilo !== null) {
    retci.push({
      opis: "Ljepilo",
      kolicina: `${formatBroj(p.ljepilo_kom, 0)} kom`,
      cijena: formatKM(p.ljepilo_cijena ?? 0),
      iznos: formatKM(r.ljepilo),
    });
  }
  if (p.prijevoz !== null && r.prijevoz !== null) {
    retci.push({ opis: "Prijevoz", kolicina: "1", cijena: formatKM(r.prijevoz), iznos: formatKM(r.prijevoz) });
  }

  // Isti redoslijed i nazivi kao <Razrada> na detaljima; dodaci su već retci tablice.
  const sazetak: RedSazetka[] = [];
  if (r.popust > 0 || r.uSustavuPdv) sazetak.push({ naziv: "Međuzbroj", iznos: formatKM(r.medjuzbroj), istaknuto: true });
  if (r.popust > 0) {
    sazetak.push({
      naziv: r.popustPosto !== null ? `Popust ${formatBroj(r.popustPosto)} %` : "Popust",
      iznos: formatKM(-r.popust),
    });
    if (r.uSustavuPdv) sazetak.push({ naziv: "Iznos nakon popusta", iznos: formatKM(r.medjuzbroj - r.popust) });
  }
  if (r.uSustavuPdv) {
    sazetak.push({ naziv: "Osnovica", iznos: formatKM(r.osnovica) });
    sazetak.push({ naziv: `PDV ${formatBroj(r.pdvStopa)} %`, iznos: formatKM(r.pdv) });
  }

  const naziv = firma.naziv_firme.trim();
  return {
    broj: p.broj,
    datum: formatDatum(p.updated_at),
    imeDatoteke: imeDatoteke(p.broj),
    tekstPoruke: tekstPoruke(p.broj, naziv),
    firma: {
      naziv,
      retci: neprazno(
        neprazno(firma.adresa, firma.mjesto).join(", "),
        neprazno(firma.telefon, firma.email).join(" · "),
        firma.jib?.trim() ? `JIB: ${firma.jib.trim()}` : null,
        // PDV broj samo ako je predračun napravljen u sustavu PDV-a (snimak postavki na predračunu).
        p.pdv_u_sustavu && firma.pdv_broj?.trim() ? `PDV broj: ${firma.pdv_broj.trim()}` : null,
      ),
    },
    kupac: neprazno(p.kupac_ime, p.kupac_telefon, p.kupac_mjesto),
    retci: retci.map((redak, i) => ({ rb: i + 1, ...redak })),
    sazetak,
    ukupno: formatKM(r.ukupno),
    podnozje: neprazno(naziv, firma.telefon, firma.email).join(" · "),
  };
}
