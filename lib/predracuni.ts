// Čista pravila za uređivač predračuna (bez ovisnosti o Reactu i bazi): čitanje polja uređivača,
// izračun preko lib/kalkulacija.ts, podaci za RPC spremi_predracun i manjak stanja kod potvrde.
//
// Iznosi u uređivaču i bazi su u KM (npr. 22.5); kalkulacija interno radi u feninzima.

import {
  fenUKm,
  izracunaj,
  kmUFen,
  type JedinicaUnosa,
  type PdvPostavke,
  type Popust,
  type RezultatKalkulacije,
  type UlazKalkulacije,
} from "./kalkulacija";
import { formatBroj, parseBroj } from "./format";

export type { JedinicaUnosa, PdvPostavke, Popust };

/** Polje popusta u uređivaču (ukupni i na stavci). Prazna vrijednost = bez popusta. */
export type PoljePopusta = { tip: "posto" | "km"; vrijednost: string };

export const prazanPopust = (): PoljePopusta => ({ tip: "posto", vrijednost: "" });

/* ---------------------------------------------------------------------------
 * Granice (kao u bazi: numeric(10,2) za cijene i m², integer za komade)
 * ------------------------------------------------------------------------- */

export const NAJVISE_STAVKI = 200;
export const NAJVISE_KOMADA = 1_000_000;
export const NAJVISE_M2 = 1_000_000;
/** numeric(10,2): najviše 99.999.999,99. */
export const NAJVISE_KM = 99_999_999.99;
/** numeric(12,2) za iznose stavki i zbrojeve, u feninzima. */
const NAJVISE_IZNOS_FEN = 999_999_999_999;

export const DUZINA = {
  kupacIme: 120,
  kupacTelefon: 40,
  kupacMjesto: 80,
  kupacAdresa: 200,
  kupacJib: 20,
  svrha: 200,
  nacinPlacanja: 60,
  napomena: 1000,
} as const;

/** Rok valjanosti predračuna u danima (smallint u bazi, check 1–365). */
export const NAJVISE_DANA_VALJANOSTI = 365;

/** Zadane vrijednosti novog predračuna (kao u Excel predlošku). */
export const ZADANI_UVJETI = { nacinPlacanja: "gotovinsko", vrijediDana: 15 } as const;

/* ---------------------------------------------------------------------------
 * Stanje uređivača (tekst polja, kako ga drži forma)
 * ------------------------------------------------------------------------- */

export type StavkaUredivaca = {
  artiklId: number;
  naziv: string;
  slika: string | null;
  /** Snimak cijene u KM (iz obloge pri dodavanju, ili iz spremljenog predračuna). */
  cijenaKom: number;
  m2PoKomadu: number | null;
  unos: JedinicaUnosa;
  /** Tekst polja količine ("12,5" m² ili "28" kom). */
  kolicina: string;
  /** Popust na ovu stavku (samo obloge). */
  popust: PoljePopusta;
};

export type StanjeUredivaca = {
  kupacIme: string;
  kupacTelefon: string;
  kupacMjesto: string;
  kupacAdresa: string;
  kupacJib: string;
  /** Uvjeti (idu na PDF): tekst polja. `datumIsporuke` je "YYYY-MM-DD" iz <input type="date"> ili "". */
  svrha: string;
  nacinPlacanja: string;
  datumIsporuke: string;
  vrijediDana: string;
  stavke: StavkaUredivaca[];
  /** `rucno` = korisnik je sam upisao m²; inače polje prati prijedlog (zbroj m² stavki). */
  ugradnja: { ukljucena: boolean; m2: string; rucno: boolean; cijenaM2: string };
  ljepilo: { ukljuceno: boolean; kom: string; cijena: string };
  prijevoz: { ukljucen: boolean; iznos: string };
  /** Ukupni popust (na zbroj nakon popusta stavki). Prazna vrijednost = bez popusta. */
  popust: PoljePopusta;
  napomena: string;
};

export function prazanUredivac(): StanjeUredivaca {
  return {
    kupacIme: "",
    kupacTelefon: "",
    kupacMjesto: "",
    kupacAdresa: "",
    kupacJib: "",
    svrha: "",
    nacinPlacanja: ZADANI_UVJETI.nacinPlacanja,
    datumIsporuke: "",
    vrijediDana: String(ZADANI_UVJETI.vrijediDana),
    stavke: [],
    ugradnja: { ukljucena: false, m2: "", rucno: false, cijenaM2: "" },
    ljepilo: { ukljuceno: false, kom: "", cijena: "" },
    prijevoz: { ukljucen: false, iznos: "" },
    popust: prazanPopust(),
    napomena: "",
  };
}

/** Broj za polje uređivača: 12.5 → "12,5", null → "". */
export function uPolje(n: number | null | undefined, decimala = 2): string {
  return n == null ? "" : formatBroj(n, decimala).replace(/\./g, "");
}

/* ---------------------------------------------------------------------------
 * Podaci predračuna: ono što uređivač šalje Server Actionu (brojevi, bez cijena stavki)
 * ------------------------------------------------------------------------- */

export type PodaciPredracuna = {
  kupacIme: string;
  kupacTelefon: string;
  kupacMjesto: string;
  kupacAdresa: string;
  kupacJib: string;
  svrha: string;
  nacinPlacanja: string;
  /** "YYYY-MM-DD" ili null. */
  datumIsporuke: string | null;
  vrijediDana: number | null;
  napomena: string;
  /** Cijene se ne šalju: server uzima snimak iz baze. */
  stavke: { artiklId: number; unos: JedinicaUnosa; kolicina: number; popust: Popust | null }[];
  ugradnja: { m2: number; cijenaM2: number } | null;
  ljepilo: { kom: number; cijena: number } | null;
  prijevoz: number | null;
  popust: Popust | null;
};

/** Ključevi grešaka: polja uređivača, a za stavke `stavka:<artiklId>`. */
export type GreskeUredivaca = Partial<Record<string, string>>;

export const kljucStavke = (artiklId: number) => `stavka:${artiklId}`;
export const kljucPopustaStavke = (artiklId: number) => `popust:${artiklId}`;

/** `veceOd`: broj mora biti strogo veći od `najmanje` (količine), inače ≥ (iznosi). */
type PravilaBroja = { decimala: number; najmanje: number; veceOd?: boolean; najvise: number; prevelik?: string };

/** Tekst → broj prema pravilima. Prazno → { prazno }. */
function procitajBroj(tekst: string, p: PravilaBroja): { broj: number } | { greska: string } | { prazno: true } {
  if (tekst.trim() === "") return { prazno: true };
  const n = parseBroj(tekst);
  if (n === null) return { greska: "Upišite ispravan broj." };
  if (p.decimala === 0 && !Number.isInteger(n)) return { greska: "Upišite cijeli broj." };
  if (!imaNajviseDecimala(n, p.decimala)) return { greska: `Najviše ${p.decimala} decimale.` };
  if (p.veceOd ? n <= p.najmanje : n < p.najmanje) {
    return { greska: p.veceOd ? "Upišite broj veći od 0." : "Broj ne može biti negativan." };
  }
  if (n > p.najvise) return { greska: p.prevelik ?? "Broj je prevelik." };
  return { broj: Math.round(n * 10 ** p.decimala) / 10 ** p.decimala };
}

export function imaNajviseDecimala(n: number, decimala: number): boolean {
  const f = 10 ** decimala;
  return Math.abs(n * f - Math.round(n * f)) < 1e-6;
}

const KOLICINA_M2: PravilaBroja = { decimala: 2, najmanje: 0, veceOd: true, najvise: NAJVISE_M2 };
const KOLICINA_KOM: PravilaBroja = { decimala: 0, najmanje: 0, veceOd: true, najvise: NAJVISE_KOMADA };
const IZNOS_KM: PravilaBroja = { decimala: 2, najmanje: 0, najvise: NAJVISE_KM };

/** Pravila za količinu stavke (dijele ih uređivač i zod shema na serveru). */
export function pravilaKolicine(unos: JedinicaUnosa) {
  return unos === "m2" ? KOLICINA_M2 : KOLICINA_KOM;
}

/**
 * Pročitaj uređivač: ispravni dijelovi idu u `podaci` (za izračun uživo i za spremanje),
 * a neispravni ili nepotpuni u `greske`. Stavka bez količine se izostavlja iz `podaci`.
 */
export function procitajUredivac(s: StanjeUredivaca, predlozeniM2Ugradnje: number): {
  podaci: PodaciPredracuna;
  greske: GreskeUredivaca;
} {
  const greske: GreskeUredivaca = {};

  const stavke: PodaciPredracuna["stavke"] = [];
  for (const st of s.stavke) {
    const popustStavke = procitajPopust(st.popust);
    if ("greska" in popustStavke) greske[kljucPopustaStavke(st.artiklId)] = popustStavke.greska;
    if (st.unos === "m2" && st.m2PoKomadu == null) {
      greske[kljucStavke(st.artiklId)] = "Obloga nema m² po komadu. Upišite količinu u komadima.";
      continue;
    }
    const r = procitajBroj(st.kolicina, pravilaKolicine(st.unos));
    if ("broj" in r) {
      stavke.push({
        artiklId: st.artiklId,
        unos: st.unos,
        kolicina: r.broj,
        popust: "popust" in popustStavke ? popustStavke.popust : null,
      });
    } else greske[kljucStavke(st.artiklId)] = "greska" in r ? r.greska : "Upišite količinu.";
  }
  if (s.stavke.length === 0) greske.stavke = "Dodajte barem jednu oblogu.";

  let ugradnja: PodaciPredracuna["ugradnja"] = null;
  if (s.ugradnja.ukljucena) {
    const m2 = s.ugradnja.rucno
      ? procitajBroj(s.ugradnja.m2, KOLICINA_M2)
      : predlozeniM2Ugradnje > 0
        ? { broj: predlozeniM2Ugradnje }
        : { prazno: true as const };
    const cijena = procitajBroj(s.ugradnja.cijenaM2, IZNOS_KM);
    if (!("broj" in m2)) greske.ugradnja_m2 = "greska" in m2 ? m2.greska : "Upišite m² za ugradnju.";
    if (!("broj" in cijena)) greske.ugradnja_cijena = "greska" in cijena ? cijena.greska : "Upišite cijenu po m².";
    if ("broj" in m2 && "broj" in cijena) ugradnja = { m2: m2.broj, cijenaM2: cijena.broj };
  }

  let ljepilo: PodaciPredracuna["ljepilo"] = null;
  if (s.ljepilo.ukljuceno) {
    const kom = procitajBroj(s.ljepilo.kom, KOLICINA_KOM);
    const cijena = procitajBroj(s.ljepilo.cijena, IZNOS_KM);
    if (!("broj" in kom)) greske.ljepilo_kom = "greska" in kom ? kom.greska : "Upišite broj komada.";
    if (!("broj" in cijena)) greske.ljepilo_cijena = "greska" in cijena ? cijena.greska : "Upišite cijenu ljepila.";
    if ("broj" in kom && "broj" in cijena) ljepilo = { kom: kom.broj, cijena: cijena.broj };
  }

  let prijevoz: number | null = null;
  if (s.prijevoz.ukljucen) {
    const r = procitajBroj(s.prijevoz.iznos, IZNOS_KM);
    if ("broj" in r) prijevoz = r.broj;
    else greske.prijevoz = "greska" in r ? r.greska : "Upišite iznos prijevoza.";
  }

  const ukupniPopust = procitajPopust(s.popust);
  if ("greska" in ukupniPopust) greske.popust = ukupniPopust.greska;
  const popust = "popust" in ukupniPopust ? ukupniPopust.popust : null;

  let vrijediDana: number | null = null;
  const dana = procitajBroj(s.vrijediDana, {
    decimala: 0,
    najmanje: 0,
    veceOd: true,
    najvise: NAJVISE_DANA_VALJANOSTI,
    prevelik: `Najviše ${NAJVISE_DANA_VALJANOSTI} dana.`,
  });
  if ("greska" in dana) greske.vrijedi_dana = dana.greska;
  else if ("broj" in dana) vrijediDana = dana.broj;

  const datumIsporuke = s.datumIsporuke.trim() === "" ? null : s.datumIsporuke.trim();
  if (datumIsporuke !== null && !jeIspravanDatum(datumIsporuke)) greske.datum_isporuke = "Upišite ispravan datum.";

  const duljine = [
    ["kupac_ime", s.kupacIme, DUZINA.kupacIme],
    ["kupac_telefon", s.kupacTelefon, DUZINA.kupacTelefon],
    ["kupac_mjesto", s.kupacMjesto, DUZINA.kupacMjesto],
    ["kupac_adresa", s.kupacAdresa, DUZINA.kupacAdresa],
    ["kupac_jib", s.kupacJib, DUZINA.kupacJib],
    ["svrha", s.svrha, DUZINA.svrha],
    ["nacin_placanja", s.nacinPlacanja, DUZINA.nacinPlacanja],
    ["napomena", s.napomena, DUZINA.napomena],
  ] as const;
  for (const [polje, tekst, najvise] of duljine) {
    if (tekst.trim().length > najvise) greske[polje] = `Najviše ${najvise} znakova.`;
  }

  return {
    podaci: {
      kupacIme: s.kupacIme.trim(),
      kupacTelefon: s.kupacTelefon.trim(),
      kupacMjesto: s.kupacMjesto.trim(),
      kupacAdresa: s.kupacAdresa.trim(),
      kupacJib: s.kupacJib.trim(),
      svrha: s.svrha.trim(),
      nacinPlacanja: s.nacinPlacanja.trim(),
      datumIsporuke: datumIsporuke !== null && jeIspravanDatum(datumIsporuke) ? datumIsporuke : null,
      vrijediDana,
      napomena: s.napomena.trim(),
      stavke,
      ugradnja,
      ljepilo,
      prijevoz,
      popust,
    },
    greske,
  };
}

/** Polje popusta → popust (null = prazno ili 0) ili greška. Isto za ukupni popust i popust stavke. */
function procitajPopust(p: PoljePopusta): { popust: Popust | null } | { greska: string } {
  const r = procitajBroj(
    p.vrijednost,
    p.tip === "posto" ? { decimala: 2, najmanje: 0, najvise: 100, prevelik: "Popust može biti najviše 100 %." } : IZNOS_KM,
  );
  if ("greska" in r) return { greska: r.greska };
  return { popust: "broj" in r && r.broj > 0 ? { tip: p.tip, vrijednost: r.broj } : null };
}

/** "YYYY-MM-DD" koji postoji u kalendaru (npr. ne 2026-02-30). */
export function jeIspravanDatum(t: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** Zbroj m² stavki za prijedlog ugradnje (kao `predlozeniM2Ugradnje` u kalkulaciji), samo iz ispravnih stavki. */
export function predlozeniM2(s: StanjeUredivaca): number {
  const podaci = procitajUredivac({ ...s, ugradnja: { ...s.ugradnja, ukljucena: false } }, 0).podaci;
  const snimak = new Map(s.stavke.map((st) => [st.artiklId, st]));
  return izracunajPredracun(podaci, snimak, { uSustavu: false, cijeneSaPdv: false, stopa: 0 }).rezultat.predlozeniM2Ugradnje;
}

/* ---------------------------------------------------------------------------
 * Izračun
 * ------------------------------------------------------------------------- */

/** Snimak obloge na stavci: naziv, cijena/kom u KM, m² po komadu. */
export type SnimakStavke = { naziv: string; cijenaKom: number; m2PoKomadu: number | null };

/** Podaci + snimci cijena → ulaz i rezultat kalkulacije. Baca Error za neispravan ulaz (kalkulacija). */
export function izracunajPredracun(
  podaci: PodaciPredracuna,
  snimak: Map<number, SnimakStavke>,
  pdv: PdvPostavke,
): { ulaz: UlazKalkulacije; rezultat: RezultatKalkulacije } {
  const ulaz: UlazKalkulacije = {
    stavke: podaci.stavke.map((st) => {
      const s = snimak.get(st.artiklId);
      if (!s) throw new Error("Obloga iz predračuna nije pronađena.");
      return {
        cijenaKomFen: kmUFen(s.cijenaKom),
        m2PoKomadu: s.m2PoKomadu,
        unos: st.unos,
        kolicina: st.kolicina,
        popust: st.popust ?? undefined,
      };
    }),
    ugradnja: podaci.ugradnja ? { m2: podaci.ugradnja.m2, cijenaM2Fen: kmUFen(podaci.ugradnja.cijenaM2) } : undefined,
    ljepilo: podaci.ljepilo ? { kom: podaci.ljepilo.kom, cijenaFen: kmUFen(podaci.ljepilo.cijena) } : undefined,
    prijevozFen: podaci.prijevoz === null ? undefined : kmUFen(podaci.prijevoz),
    popust: podaci.popust ?? undefined,
    pdv,
  };
  return { ulaz, rezultat: izracunaj(ulaz) };
}

/** Je li neki iznos prevelik za bazu (numeric(12,2)). */
export function prevelikIznos(r: RezultatKalkulacije): boolean {
  return [r.medjuzbrojFen, r.ukupnoFen, ...r.stavke.map((s) => s.iznosFen)].some((f) => f > NAJVISE_IZNOS_FEN);
}

/* ---------------------------------------------------------------------------
 * Razrada iznosa za prikaz (uređivač i detalji), u KM
 * ------------------------------------------------------------------------- */

export type IznosiRazrade = {
  /** Zbroj stavki (obloga) nakon popusta stavki. */
  stavke: number;
  /** Zbroj popusta stavki (već oduzet u `stavke`). */
  popustStavki: number;
  /** null = dodatak nije uključen. */
  ugradnja: number | null;
  ljepilo: number | null;
  prijevoz: number | null;
  medjuzbroj: number;
  popust: number;
  /** Postotak za popust u %; null za popust u KM. */
  popustPosto: number | null;
  osnovica: number;
  pdv: number;
  pdvStopa: number;
  uSustavuPdv: boolean;
  ukupno: number;
};

/** Rezultat kalkulacije → iznosi za <Razrada>. */
export function iznosiRazrade(ulaz: UlazKalkulacije, r: RezultatKalkulacije): IznosiRazrade {
  return {
    stavke: fenUKm(r.stavkeFen),
    popustStavki: fenUKm(r.popustStavkiFen),
    ugradnja: ulaz.ugradnja ? fenUKm(r.ugradnjaFen) : null,
    ljepilo: ulaz.ljepilo ? fenUKm(r.ljepiloFen) : null,
    prijevoz: ulaz.prijevozFen !== undefined ? fenUKm(r.prijevozFen) : null,
    medjuzbroj: fenUKm(r.medjuzbrojFen),
    popust: fenUKm(r.popustFen),
    popustPosto: ulaz.popust?.tip === "posto" ? ulaz.popust.vrijednost : null,
    osnovica: fenUKm(r.osnovicaFen),
    pdv: fenUKm(r.pdvFen),
    pdvStopa: ulaz.pdv.stopa,
    uSustavuPdv: ulaz.pdv.uSustavu,
    ukupno: fenUKm(r.ukupnoFen),
  };
}

/**
 * Razrada spremljenog predračuna (detalji): zbrojevi su iz baze, a iznosi pojedinih dodataka
 * (koji se ne spremaju zasebno) računaju se istom kalkulacijom iz spremljenih podataka.
 */
export function iznosiSpremljenog(
  p: SpremljeniPredracun & {
    pdv_u_sustavu: boolean;
    pdv_cijene_sa_pdv: boolean;
    pdv_stopa: number;
    medjuzbroj: number;
    popust_iznos: number;
    osnovica: number;
    pdv_iznos: number;
    ukupno: number;
  },
): IznosiRazrade {
  const ulaz: UlazKalkulacije = {
    stavke: p.stavke.map((s) => ({
      cijenaKomFen: kmUFen(s.cijena_kom),
      m2PoKomadu: s.m2_po_komadu,
      unos: "kom",
      kolicina: s.komada,
      popust: s.popust_tip && s.popust_vrijednost !== null ? { tip: s.popust_tip, vrijednost: s.popust_vrijednost } : undefined,
    })),
    ugradnja: p.ugradnja_m2 !== null ? { m2: p.ugradnja_m2, cijenaM2Fen: kmUFen(p.ugradnja_cijena_m2 ?? 0) } : undefined,
    ljepilo: p.ljepilo_kom !== null ? { kom: p.ljepilo_kom, cijenaFen: kmUFen(p.ljepilo_cijena ?? 0) } : undefined,
    prijevozFen: p.prijevoz !== null ? kmUFen(p.prijevoz) : undefined,
    popust: p.popust_tip && p.popust_vrijednost !== null ? { tip: p.popust_tip, vrijednost: p.popust_vrijednost } : undefined,
    pdv: { uSustavu: p.pdv_u_sustavu, cijeneSaPdv: p.pdv_cijene_sa_pdv, stopa: p.pdv_stopa },
  };
  return {
    ...iznosiRazrade(ulaz, izracunaj(ulaz)),
    medjuzbroj: p.medjuzbroj,
    popust: p.popust_iznos,
    osnovica: p.osnovica,
    pdv: p.pdv_iznos,
    ukupno: p.ukupno,
  };
}

/* ---------------------------------------------------------------------------
 * RPC spremi_predracun
 * ------------------------------------------------------------------------- */

/** `p_podaci` za RPC spremi_predracun (DB.md §5.3). Svi iznosi u KM. */
export function podaciZaRpc(
  podaci: PodaciPredracuna,
  snimak: Map<number, SnimakStavke>,
  pdv: PdvPostavke,
  rezultat: RezultatKalkulacije,
  kopijaOd: number | null,
) {
  return {
    kupac_ime: podaci.kupacIme,
    kupac_telefon: podaci.kupacTelefon,
    kupac_mjesto: podaci.kupacMjesto,
    kupac_adresa: podaci.kupacAdresa,
    kupac_jib: podaci.kupacJib,
    svrha: podaci.svrha,
    nacin_placanja: podaci.nacinPlacanja,
    datum_isporuke: podaci.datumIsporuke,
    vrijedi_dana: podaci.vrijediDana,
    napomena: podaci.napomena,
    ugradnja_m2: podaci.ugradnja?.m2 ?? null,
    ugradnja_cijena_m2: podaci.ugradnja?.cijenaM2 ?? null,
    ljepilo_kom: podaci.ljepilo?.kom ?? null,
    ljepilo_cijena: podaci.ljepilo?.cijena ?? null,
    prijevoz: podaci.prijevoz,
    popust_tip: podaci.popust?.tip ?? null,
    popust_vrijednost: podaci.popust?.vrijednost ?? null,
    pdv_u_sustavu: pdv.uSustavu,
    pdv_cijene_sa_pdv: pdv.cijeneSaPdv,
    pdv_stopa: pdv.stopa,
    medjuzbroj: fenUKm(rezultat.medjuzbrojFen),
    popust_iznos: fenUKm(rezultat.popustFen),
    osnovica: fenUKm(rezultat.osnovicaFen),
    pdv_iznos: fenUKm(rezultat.pdvFen),
    ukupno: fenUKm(rezultat.ukupnoFen),
    kopija_od: kopijaOd,
    stavke: podaci.stavke.map((st, i) => {
      const s = snimak.get(st.artiklId)!;
      const r = rezultat.stavke[i];
      return {
        artikl_id: st.artiklId,
        naziv: s.naziv,
        cijena_kom: s.cijenaKom,
        m2_po_komadu: s.m2PoKomadu,
        unos: st.unos,
        unesena_m2: st.unos === "m2" ? st.kolicina : null,
        komada: r.komada,
        popust_tip: st.popust?.tip ?? null,
        popust_vrijednost: st.popust?.vrijednost ?? null,
        popust_iznos: fenUKm(r.popustFen),
        iznos: fenUKm(r.iznosFen),
      };
    }),
  };
}

/* ---------------------------------------------------------------------------
 * Manjak stanja kod potvrde
 * ------------------------------------------------------------------------- */

export type Manjak = { artiklId: number; naziv: string; treba: number; ima: number; nedostaje: number };

/** Obloge kojih nema dovoljno na stanju za potvrdu (komadi se zbrajaju po oblozi). */
export function manjak(
  stavke: { artiklId: number; naziv: string; komada: number }[],
  stanje: Map<number, number>,
): Manjak[] {
  const treba = new Map<number, { naziv: string; komada: number }>();
  for (const s of stavke) {
    const t = treba.get(s.artiklId);
    treba.set(s.artiklId, { naziv: t?.naziv ?? s.naziv, komada: (t?.komada ?? 0) + s.komada });
  }
  const rezultat: Manjak[] = [];
  for (const [artiklId, { naziv, komada }] of treba) {
    const ima = stanje.get(artiklId) ?? 0;
    if (komada > ima) rezultat.push({ artiklId, naziv, treba: komada, ima, nedostaje: komada - Math.max(ima, 0) });
  }
  return rezultat;
}

/* ---------------------------------------------------------------------------
 * Spremljeni predračun → uređivač (Uredi i Kopiraj)
 * ------------------------------------------------------------------------- */

export type SpremljeniPredracun = {
  kupac_ime: string | null;
  kupac_telefon: string | null;
  kupac_mjesto: string | null;
  kupac_adresa: string | null;
  kupac_jib: string | null;
  svrha: string | null;
  nacin_placanja: string | null;
  datum_isporuke: string | null;
  vrijedi_dana: number | null;
  napomena: string | null;
  ugradnja_m2: number | null;
  ugradnja_cijena_m2: number | null;
  ljepilo_kom: number | null;
  ljepilo_cijena: number | null;
  prijevoz: number | null;
  popust_tip: "posto" | "km" | null;
  popust_vrijednost: number | null;
  stavke: {
    artikl_id: number;
    naziv: string;
    cijena_kom: number;
    m2_po_komadu: number | null;
    unos: JedinicaUnosa;
    unesena_m2: number | null;
    komada: number;
    popust_tip: "posto" | "km" | null;
    popust_vrijednost: number | null;
    slika: string | null;
  }[];
};

function dodaciIzSpremljenog(p: SpremljeniPredracun): Pick<StanjeUredivaca, "ugradnja" | "ljepilo" | "prijevoz" | "popust"> {
  return {
    ugradnja: {
      ukljucena: p.ugradnja_m2 !== null,
      m2: uPolje(p.ugradnja_m2),
      rucno: p.ugradnja_m2 !== null,
      cijenaM2: uPolje(p.ugradnja_cijena_m2),
    },
    ljepilo: { ukljuceno: p.ljepilo_kom !== null, kom: uPolje(p.ljepilo_kom, 0), cijena: uPolje(p.ljepilo_cijena) },
    prijevoz: { ukljucen: p.prijevoz !== null, iznos: uPolje(p.prijevoz) },
    popust: { tip: p.popust_tip ?? "posto", vrijednost: uPolje(p.popust_vrijednost) },
  };
}

function popustStavke(s: SpremljeniPredracun["stavke"][number]): PoljePopusta {
  return { tip: s.popust_tip ?? "posto", vrijednost: uPolje(s.popust_vrijednost) };
}

function kolicinaStavke(s: SpremljeniPredracun["stavke"][number]): string {
  return s.unos === "m2" ? uPolje(s.unesena_m2) : uPolje(s.komada, 0);
}

/** Uredi: sve kao spremljeno, sa snimkom cijena iz predračuna. */
export function uredivacIzPredracuna(p: SpremljeniPredracun): StanjeUredivaca {
  return {
    kupacIme: p.kupac_ime ?? "",
    kupacTelefon: p.kupac_telefon ?? "",
    kupacMjesto: p.kupac_mjesto ?? "",
    kupacAdresa: p.kupac_adresa ?? "",
    kupacJib: p.kupac_jib ?? "",
    svrha: p.svrha ?? "",
    nacinPlacanja: p.nacin_placanja ?? "",
    datumIsporuke: p.datum_isporuke ?? "",
    vrijediDana: uPolje(p.vrijedi_dana, 0),
    napomena: p.napomena ?? "",
    stavke: p.stavke.map((s) => ({
      artiklId: s.artikl_id,
      naziv: s.naziv,
      slika: s.slika,
      cijenaKom: s.cijena_kom,
      m2PoKomadu: s.m2_po_komadu,
      unos: s.unos,
      kolicina: kolicinaStavke(s),
      popust: popustStavke(s),
    })),
    ...dodaciIzSpremljenog(p),
  };
}

export type TrenutnaObloga = {
  id: number;
  naziv: string;
  slika: string | null;
  cijena_kom: number;
  m2_po_komadu: number | null;
  aktivan: boolean;
};

/**
 * Kopiraj (PRD §5.5): iste stavke (s popustima stavki), dodaci i popust po trenutnim cijenama obloga, prazan kupac i napomena.
 * Način plaćanja i rok valjanosti se prenose; svrha i datum isporuke ostaju prazni (vežu se uz kupca).
 * Arhivirane (ili obrisane) obloge se preskaču i vraćaju u `preskocene`.
 */
export function uredivacIzKopije(
  p: SpremljeniPredracun,
  obloge: Map<number, TrenutnaObloga>,
): { stanje: StanjeUredivaca; preskocene: string[] } {
  const preskocene: string[] = [];
  const stavke: StavkaUredivaca[] = [];
  for (const s of p.stavke) {
    const o = obloge.get(s.artikl_id);
    if (!o || !o.aktivan) {
      preskocene.push(s.naziv);
      continue;
    }
    // Ako obloga više nema m² po komadu, količina se prenosi u komadima.
    const uM2 = s.unos === "m2" && o.m2_po_komadu != null;
    stavke.push({
      artiklId: o.id,
      naziv: o.naziv,
      slika: o.slika,
      cijenaKom: o.cijena_kom,
      m2PoKomadu: o.m2_po_komadu,
      unos: uM2 ? "m2" : "kom",
      kolicina: uM2 ? uPolje(s.unesena_m2) : uPolje(s.komada, 0),
      popust: popustStavke(s),
    });
  }
  return {
    stanje: {
      ...prazanUredivac(),
      nacinPlacanja: p.nacin_placanja ?? ZADANI_UVJETI.nacinPlacanja,
      vrijediDana: uPolje(p.vrijedi_dana ?? ZADANI_UVJETI.vrijediDana, 0),
      stavke,
      ...dodaciIzSpremljenog(p),
    },
    preskocene,
  };
}
