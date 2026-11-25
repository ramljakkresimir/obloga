// Model PDF predračuna (PRD §5.5, Design.md › PDF predračun) po Excel predlošku „Predračun Obloga.ba.xlsx”.
// Čiste funkcije bez Reacta: server gradi model, a preglednik ga samo iscrtava (components/pdf/PredracunPdf.tsx).

import { fenUKm, kmUFen } from "./kalkulacija";
import { brojSImenicom, formatBroj, formatDatumPdf, formatKM, formatM2, OBLIK_DAN } from "./format";
import { iznosiSpremljenog, type SpremljeniPredracun } from "./predracuni";
import type { Tables } from "@/utils/supabase/types";

/** Slike iz Excel predloška (public/slike/pdf). */
export const SLIKE_PDF = {
  logo: "/slike/pdf/logo.png",
  web: "/slike/pdf/web.png",
  instagram: "/slike/pdf/instagram.png",
  whatsapp: "/slike/pdf/whatsapp.png",
  viber: "/slike/pdf/viber.png",
} as const;

/** Podaci firme iz postavki koji idu na PDF (email namjerno nije: nema ga u predlošku). */
export type FirmaPdf = Pick<
  Tables<"postavke">,
  | "naziv_firme"
  | "vlasnik"
  | "adresa"
  | "mjesto"
  | "telefon"
  | "jib"
  | "pdv_broj"
  | "banka"
  | "transakcijski_racun"
  | "web"
  | "instagram"
  | "whatsapp"
  | "viber"
>;

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

export type VrstaKontakta = "web" | "instagram" | "whatsapp" | "viber";
export type KontaktPdf = { vrsta: VrstaKontakta; tekst: string };

/** Redak glavne tablice: Red. Br. | Naziv artikla | Količina/kom | Cijena/ kom | Popust % | Vrijednost. */
export type RedakPdf = { rb: string; naziv: string; kolicina: string; cijena: string; popust: string; iznos: string };
/** Tablica „Ugradnja:” (m2 | Cijena/ m2 | iznos). */
export type UgradnjaPdf = { rb: string; naziv: string; m2: string; cijenaM2: string; iznos: string };
export type RedZbroja = { naziv: string; iznos: string };

/** Sve što PDF prikazuje, već formatirano (plain objekt, prolazi server → client). */
export type PredracunPdf = {
  broj: string;
  datum: string;
  /** "15 dana"; prazno = nije upisano. */
  vrijedi: string;
  imeDatoteke: string;
  tekstPoruke: string;
  firma: {
    naziv: string;
    /** "vl. Jela Klarić" ili prazno. */
    vlasnik: string;
    /** Adresa, JIB, (PDV broj), Telefon, Transakcijski račun, Banka – prazni se preskaču. */
    retci: string[];
  };
  kontakti: KontaktPdf[];
  /** Prazan tekst = polje ostaje prazno (kao u predlošku). */
  kupac: { ime: string; adresa: string; jib: string; telefon: string };
  retci: RedakPdf[];
  ugradnja: UgradnjaPdf | null;
  /** Redovi iznad „Ukupno za platiti:”; ispod zadnjeg je crta. */
  zbroj: RedZbroja[];
  ukupno: string;
  datumIsporuke: string;
  nacinPlacanja: string;
  svrha: string;
  /** "PDV uračunat u cijene" / "Cijene su bez PDV-a". */
  napomenaPdv: string;
  /** Rečenica na dnu za obveznike izvan sustava PDV-a; null u sustavu PDV-a. */
  izjavaPdv: string | null;
};

export const IZJAVA_IZVAN_PDV = "Obveznik nije u sustavu PDV-a prema Zakonu o PDV-u BiH";

/** "23-26." → "Predracun-23-26.pdf" (bez dijakritika, čudnih znakova i krajnjih crtica u imenu). */
export function imeDatoteke(broj: string): string {
  const dio = broj.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return `Predracun-${dio}.pdf`;
}

/** Tekst koji uz PDF ide u Viber / WhatsApp / mail. Broj "23-26." već završava točkom. */
export function tekstPoruke(broj: string, nazivFirme: string): string {
  return `Poštovani, u privitku je predračun br. ${broj}${broj.endsWith(".") ? "" : "."}\n${nazivFirme}`;
}

const cisto = (t: string | null | undefined) => t?.trim() ?? "";

const neprazno = (...dijelovi: (string | null | undefined)[]) =>
  dijelovi.map(cisto).filter((d) => d !== "");

/** Popust u postotku kao u Excelu (format 0%): 5 → "5%", 7,5 → "7,5%". */
const posto = (n: number) => `${formatBroj(n)}%`;

/**
 * Spremljeni predračun + podaci firme → model PDF-a. Iznosi su oni spremljeni u bazi.
 * Interna napomena namjerno nije u modelu (ne ide na PDF).
 */
export function modelPdf(p: PredracunZaPdf, firma: FirmaPdf): PredracunPdf {
  if (!p.broj) throw new Error("Predračun nema broj.");
  const r = iznosiSpremljenog(p);

  // Popust je jedan za cijeli predračun: postotak se upisuje u svaki redak, iznos je u zbroju.
  const popustRetka = r.popust > 0 && r.popustPosto !== null ? posto(r.popustPosto) : "";

  const retci: Omit<RedakPdf, "rb">[] = p.stavke.map((s) => ({
    naziv: s.naziv,
    kolicina: `${s.komada}${s.unos === "m2" && s.unesena_m2 !== null ? ` (${formatM2(s.unesena_m2)})` : ""}`,
    cijena: formatKM(s.cijena_kom),
    popust: popustRetka,
    iznos: formatKM(s.iznos),
  }));
  if (p.ljepilo_kom !== null && r.ljepilo !== null) {
    retci.push({
      naziv: "Ljepilo",
      kolicina: String(p.ljepilo_kom),
      cijena: formatKM(p.ljepilo_cijena ?? 0),
      popust: popustRetka,
      iznos: formatKM(r.ljepilo),
    });
  }

  const ugradnja: UgradnjaPdf | null =
    p.ugradnja_m2 !== null && r.ugradnja !== null
      ? {
          rb: "1.",
          naziv: "Ugradnja",
          m2: formatBroj(p.ugradnja_m2),
          cijenaM2: formatKM(p.ugradnja_cijena_m2 ?? 0),
          iznos: formatKM(r.ugradnja),
        }
      : null;

  // Kao Excel: materijal, dostava (crta ispod), Ukupno za platiti; ostali redovi samo kad postoje.
  const materijal = fenUKm(kmUFen(r.stavke) + kmUFen(r.ljepilo ?? 0));
  const zbroj: RedZbroja[] = [{ naziv: "Ukupna cijena materijala:", iznos: formatKM(materijal) }];
  if (r.ugradnja !== null) zbroj.push({ naziv: "Ugradnja:", iznos: formatKM(r.ugradnja) });
  zbroj.push({ naziv: "Cijena dostave:", iznos: r.prijevoz !== null ? formatKM(r.prijevoz) : "" });
  if (r.popust > 0) {
    zbroj.push({
      naziv: r.popustPosto !== null ? `Popust ${posto(r.popustPosto)}:` : "Popust:",
      iznos: formatKM(-r.popust),
    });
  }
  if (r.uSustavuPdv) {
    zbroj.push({ naziv: "Osnovica:", iznos: formatKM(r.osnovica) });
    zbroj.push({ naziv: `PDV ${posto(r.pdvStopa)}:`, iznos: formatKM(r.pdv) });
  }

  const naziv = cisto(firma.naziv_firme);
  const kontakti: KontaktPdf[] = (
    [
      ["web", firma.web],
      ["instagram", firma.instagram],
      ["whatsapp", firma.whatsapp],
      ["viber", firma.viber],
    ] as const
  ).flatMap(([vrsta, tekst]) => (cisto(tekst) ? [{ vrsta, tekst: cisto(tekst) }] : []));

  return {
    broj: p.broj,
    datum: formatDatumPdf(p.updated_at),
    vrijedi: p.vrijedi_dana ? brojSImenicom(p.vrijedi_dana, OBLIK_DAN) : "",
    imeDatoteke: imeDatoteke(p.broj),
    tekstPoruke: tekstPoruke(p.broj, naziv),
    firma: {
      naziv,
      vlasnik: cisto(firma.vlasnik) ? `vl. ${cisto(firma.vlasnik)}` : "",
      retci: neprazno(
        neprazno(firma.adresa, firma.mjesto).join("; "),
        cisto(firma.jib) && `JIB: ${cisto(firma.jib)}`,
        // PDV broj samo ako je predračun napravljen u sustavu PDV-a (snimak postavki na predračunu).
        p.pdv_u_sustavu && cisto(firma.pdv_broj) ? `PDV broj: ${cisto(firma.pdv_broj)}` : null,
        cisto(firma.telefon) && `Telefon: ${cisto(firma.telefon)}`,
        cisto(firma.transakcijski_racun) && `Transakcijski račun: ${cisto(firma.transakcijski_racun)}`,
        firma.banka,
      ),
    },
    kontakti,
    kupac: {
      ime: cisto(p.kupac_ime),
      adresa: neprazno(p.kupac_adresa, p.kupac_mjesto).join(", "),
      jib: cisto(p.kupac_jib),
      telefon: cisto(p.kupac_telefon),
    },
    retci: retci.map((redak, i) => ({ rb: `${i + 1}.`, ...redak })),
    ugradnja,
    zbroj,
    ukupno: formatKM(r.ukupno),
    datumIsporuke: p.datum_isporuke ? formatDatumPdf(p.datum_isporuke) : "",
    nacinPlacanja: cisto(p.nacin_placanja),
    svrha: cisto(p.svrha),
    napomenaPdv: !r.uSustavuPdv || p.pdv_cijene_sa_pdv ? "PDV uračunat u cijene" : "Cijene su bez PDV-a",
    izjavaPdv: r.uSustavuPdv ? null : IZJAVA_IZVAN_PDV,
  };
}
