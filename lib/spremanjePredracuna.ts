import "server-only";
import { z } from "zod";
import {
  DUZINA,
  imaNajviseDecimala,
  jeIspravanDatum,
  NAJVISE_DANA_VALJANOSTI,
  NAJVISE_KM,
  NAJVISE_KOMADA,
  NAJVISE_M2,
  NAJVISE_STAVKI,
  type PodaciPredracuna,
  type SnimakStavke,
} from "@/lib/predracuni";
import type { createClient } from "@/utils/supabase/server";

/*
 * Zajedničko za spremanje predračuna i brze prodaje (Server Actions u app/(app)/predracuni i app/(app)/prodaja).
 * Datoteke "use server" smiju izvoziti samo async funkcije, pa shema i pomoćne funkcije žive ovdje.
 */

export const zId = z.number().int().positive();

/* ---------------------------------------------------------------------------
 * Validacija (ista pravila kao procitajUredivac u lib/predracuni.ts)
 * ------------------------------------------------------------------------- */

const km = (najvise = NAJVISE_KM) =>
  z.number().finite().min(0).max(najvise).refine((n) => imaNajviseDecimala(n, 2), "Najviše 2 decimale.");

const tekst = (najvise: number) => z.string().trim().max(najvise, `Najviše ${najvise} znakova.`);

export const shemaPodataka = z.object({
  kupacIme: tekst(DUZINA.kupacIme),
  kupacTelefon: tekst(DUZINA.kupacTelefon),
  kupacMjesto: tekst(DUZINA.kupacMjesto),
  kupacAdresa: tekst(DUZINA.kupacAdresa),
  kupacJib: tekst(DUZINA.kupacJib),
  svrha: tekst(DUZINA.svrha),
  nacinPlacanja: tekst(DUZINA.nacinPlacanja),
  datumIsporuke: z.string().refine(jeIspravanDatum, "Neispravan datum isporuke.").nullable(),
  vrijediDana: z.number().int().min(1).max(NAJVISE_DANA_VALJANOSTI).nullable(),
  napomena: tekst(DUZINA.napomena),
  stavke: z
    .array(
      z
        .object({
          artiklId: zId,
          unos: z.enum(["m2", "kom"]),
          kolicina: z.number().finite().positive("Količina mora biti veća od 0."),
        })
        .refine(
          (s) =>
            s.unos === "kom"
              ? Number.isInteger(s.kolicina) && s.kolicina <= NAJVISE_KOMADA
              : imaNajviseDecimala(s.kolicina, 2) && s.kolicina <= NAJVISE_M2,
          "Neispravna količina.",
        ),
    )
    .min(1, "Dodajte barem jednu oblogu.")
    .max(NAJVISE_STAVKI, "Previše stavki u jednom predračunu.")
    .refine((s) => new Set(s.map((x) => x.artiklId)).size === s.length, "Ista obloga je dodana dvaput."),
  ugradnja: z
    .object({
      m2: z.number().finite().positive().max(NAJVISE_M2).refine((n) => imaNajviseDecimala(n, 2)),
      cijenaM2: km(),
    })
    .nullable(),
  ljepilo: z.object({ kom: z.number().int().positive().max(NAJVISE_KOMADA), cijena: km() }).nullable(),
  prijevoz: km().nullable(),
  popust: z
    .object({ tip: z.enum(["posto", "km"]), vrijednost: km() })
    .refine((p) => p.tip === "km" || p.vrijednost <= 100, "Popust može biti najviše 100 %.")
    .nullable(),
});

/* ---------------------------------------------------------------------------
 * Snimak obloga
 * ------------------------------------------------------------------------- */

type Supabase = ReturnType<typeof createClient>;

/**
 * Dopuni `snimak` trenutnim podacima aktivnih obloga za stavke koje ga još nemaju
 * (nove stavke), pa provjeri da se m² unos koristi samo kod obloga s m² po komadu.
 * Vraća poruku greške ili null. `greskaSpremanja` je poruka za grešku baze.
 */
export async function dopuniSnimakObloga(
  supabase: Supabase,
  stavke: PodaciPredracuna["stavke"],
  snimak: Map<number, SnimakStavke>,
  greskaSpremanja: string,
): Promise<string | null> {
  const nove = stavke.map((s) => s.artiklId).filter((a) => !snimak.has(a));
  if (nove.length > 0) {
    const { data, error } = await supabase
      .from("artikli")
      .select("id, naziv, cijena_kom, m2_po_komadu, aktivan")
      .in("id", nove);
    if (error) return greskaSpremanja;
    for (const o of data) {
      if (!o.aktivan) return `Obloga „${o.naziv}” je arhivirana i ne može se dodati. Uklonite je.`;
      snimak.set(o.id, { naziv: o.naziv, cijenaKom: o.cijena_kom, m2PoKomadu: o.m2_po_komadu });
    }
    if (nove.some((a) => !snimak.has(a))) return "Neka od obloga više ne postoji. Osvježite stranicu.";
  }

  for (const s of stavke) {
    const o = snimak.get(s.artiklId)!;
    if (s.unos === "m2" && o.m2PoKomadu == null) {
      return `Obloga „${o.naziv}” nema m² po komadu. Upišite količinu u komadima.`;
    }
  }
  return null;
}
