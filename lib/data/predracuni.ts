import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { dohvatiVlasnika } from "@/lib/auth";
import { fenUKm, kmUFen } from "@/lib/kalkulacija";
import { createClient } from "@/utils/supabase/server";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiKategorije } from "@/lib/data/postavke";
import type { SpremljeniPredracun } from "@/lib/predracuni";
import type { OblogaOdabira } from "@/components/predracun/OdabirObloge";
import type { Enums, Tables } from "@/utils/supabase/types";

/* Obrazac kao lib/data/obloge.ts (Tech.md §7). */

export type StatusPredracuna = Enums<"status_predracuna">;

/** Filter liste: status ili „svi". */
export type FilterStatusa = StatusPredracuna | "svi";

export const FILTERI_STATUSA: { vrijednost: FilterStatusa; naziv: string }[] = [
  { vrijednost: "otvoren", naziv: "Otvoreni" },
  { vrijednost: "potvrden", naziv: "Potvrđeni" },
  { vrijednost: "odbijen", naziv: "Odbijeni" },
  { vrijednost: "storniran", naziv: "Stornirani" },
  { vrijednost: "svi", naziv: "Svi" },
];

export const ZADANI_FILTER: FilterStatusa = "otvoren";

/** ?s= iz URL-a → filter (nepoznato → zadani). */
export function filterIzParametra(s: unknown): FilterStatusa {
  return FILTERI_STATUSA.some((f) => f.vrijednost === s) ? (s as FilterStatusa) : ZADANI_FILTER;
}

export const PREDRACUNA_PO_STRANICI = 50;

export type RedakPredracuna = Pick<
  Tables<"predracuni">,
  "id" | "broj" | "status" | "kupac_ime" | "kupac_mjesto" | "ukupno" | "created_at"
>;

export type StranicaPredracuna = { predracuni: RedakPredracuna[]; josIma: boolean };

/** Znakovi koji bi pokvarili PostgREST `or(...)` filter ili ilike uzorak. */
function ocistiPretragu(q: string): string {
  return q.replace(/[,()*%\\"':]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Lista predračuna (bez brzih prodaja), najnoviji prvi, po 50.
 * `q` traži u broju, imenu kupca i mjestu. `prijeId` = id zadnjeg prikazanog (keyset).
 */
export async function dohvatiPredracune({
  status,
  q,
  prijeId,
}: {
  status: FilterStatusa;
  q: string;
  prijeId?: number;
}): Promise<StranicaPredracuna> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  let upit = supabase
    .from("predracuni")
    .select("id, broj, status, kupac_ime, kupac_mjesto, ukupno, created_at")
    .eq("vrsta", "predracun")
    .order("id", { ascending: false })
    .limit(PREDRACUNA_PO_STRANICI + 1);
  if (status !== "svi") upit = upit.eq("status", status);
  const trazi = ocistiPretragu(q);
  if (trazi) {
    const uzorak = `*${trazi}*`;
    upit = upit.or(`broj.ilike.${uzorak},kupac_ime.ilike.${uzorak},kupac_mjesto.ilike.${uzorak}`);
  }
  if (prijeId) upit = upit.lt("id", prijeId);

  const { data, error } = await upit;
  if (error) throw new Error("Predračuni se ne mogu učitati.", { cause: error });

  return { predracuni: data.slice(0, PREDRACUNA_PO_STRANICI), josIma: data.length > PREDRACUNA_PO_STRANICI };
}

/** PostgREST vraća najviše 1000 redaka po upitu (max rows). */
const BLOK_ZBROJA = 1000;

export type ZbrojOtvorenih = { broj: number; ukupno: number };

/** Broj i ukupna vrijednost otvorenih predračuna (Početna, PRD §5.2). Zbraja se u feninzima. */
export async function dohvatiOtvorenePredracune(): Promise<ZbrojOtvorenih> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  let feninga = 0;
  let broj = 0;
  for (let pomak = 0; ; pomak += BLOK_ZBROJA) {
    const { data, error } = await supabase
      .from("predracuni")
      .select("ukupno")
      .eq("vrsta", "predracun")
      .eq("status", "otvoren")
      .order("id")
      .range(pomak, pomak + BLOK_ZBROJA - 1);
    if (error) throw new Error("Otvoreni predračuni se ne mogu učitati.", { cause: error });

    for (const { ukupno } of data) feninga += kmUFen(ukupno);
    broj += data.length;
    if (data.length < BLOK_ZBROJA) break;
  }

  return { broj, ukupno: fenUKm(feninga) };
}

export type StavkaDetalja = Pick<
  Tables<"predracun_stavke">,
  | "id"
  | "artikl_id"
  | "naziv"
  | "cijena_kom"
  | "m2_po_komadu"
  | "unos"
  | "unesena_m2"
  | "komada"
  | "popust_tip"
  | "popust_vrijednost"
  | "popust_iznos"
  | "iznos"
> & {
  slika: string | null;
  /** Trenutno stanje obloge (za upozorenje o manjku kod potvrde). */
  stanje: number;
  aktivan: boolean;
};

export type PredracunDetalji = Tables<"predracuni"> & {
  stavke: StavkaDetalja[];
  vlasnik: string | null;
  kopija: { id: number; broj: string | null } | null;
};

/** Predračun (ili brza prodaja) sa stavkama po redoslijedu. Ne postoji → null. */
export const dohvatiPredracun = cache(async (id: number): Promise<PredracunDetalji | null> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("predracuni")
    .select(
      "*, vlasnici(ime), predracun_stavke(id, redoslijed, artikl_id, naziv, cijena_kom, m2_po_komadu, unos, unesena_m2, komada, popust_tip, popust_vrijednost, popust_iznos, iznos, artikli(slika, stanje, aktivan))",
    )
    .eq("id", id)
    .order("redoslijed", { referencedTable: "predracun_stavke" })
    .maybeSingle();
  if (error) throw new Error("Predračun se ne može učitati.", { cause: error });
  if (!data) return null;

  let kopija: PredracunDetalji["kopija"] = null;
  if (data.kopija_od) {
    const izvor = await supabase.from("predracuni").select("id, broj").eq("id", data.kopija_od).maybeSingle();
    if (izvor.error) throw new Error("Predračun se ne može učitati.", { cause: izvor.error });
    kopija = izvor.data;
  }

  const { vlasnici, predracun_stavke, ...predracun } = data;
  return {
    ...predracun,
    vlasnik: vlasnici?.ime ?? null,
    kopija,
    stavke: predracun_stavke.map(({ artikli, ...s }) => ({
      ...s,
      slika: artikli?.slika ?? null,
      stanje: artikli?.stanje ?? 0,
      aktivan: artikli?.aktivan ?? false,
    })),
  };
});

/** Detalji → oblik za uređivač (Uredi i Kopiraj, lib/predracuni.ts). */
export function uSpremljeni(p: PredracunDetalji): SpremljeniPredracun {
  return {
    kupac_ime: p.kupac_ime,
    kupac_telefon: p.kupac_telefon,
    kupac_mjesto: p.kupac_mjesto,
    kupac_adresa: p.kupac_adresa,
    kupac_jib: p.kupac_jib,
    svrha: p.svrha,
    nacin_placanja: p.nacin_placanja,
    datum_isporuke: p.datum_isporuke,
    vrijedi_dana: p.vrijedi_dana,
    napomena: p.napomena,
    ugradnja_m2: p.ugradnja_m2,
    ugradnja_cijena_m2: p.ugradnja_cijena_m2,
    ljepilo_kom: p.ljepilo_kom,
    ljepilo_cijena: p.ljepilo_cijena,
    prijevoz: p.prijevoz,
    popust_tip: p.popust_tip,
    popust_vrijednost: p.popust_vrijednost,
    stavke: p.stavke.map((s) => ({
      artikl_id: s.artikl_id,
      naziv: s.naziv,
      cijena_kom: s.cijena_kom,
      m2_po_komadu: s.m2_po_komadu,
      unos: s.unos,
      unesena_m2: s.unesena_m2,
      komada: s.komada,
      popust_tip: s.popust_tip,
      popust_vrijednost: s.popust_vrijednost,
      slika: s.slika,
    })),
  };
}

/** Aktivne obloge i njihove kategorije za odabir u uređivaču predračuna. */
export async function dohvatiOdabirObloga(): Promise<{
  obloge: OblogaOdabira[];
  kategorije: { id: number; naziv: string }[];
}> {
  const [sve, kategorije] = await Promise.all([dohvatiObloge(), dohvatiKategorije()]);
  const aktivne = sve.filter((o) => o.aktivan);
  return {
    obloge: aktivne.map(({ id, naziv, slika, kategorija_id, cijena_kom, m2_po_komadu, stanje }) => ({
      id,
      naziv,
      slika,
      kategorija_id,
      cijena_kom,
      m2_po_komadu,
      stanje,
    })),
    kategorije: kategorije
      .filter((k) => aktivne.some((o) => o.kategorija_id === k.id))
      .map(({ id, naziv }) => ({ id, naziv })),
  };
}
