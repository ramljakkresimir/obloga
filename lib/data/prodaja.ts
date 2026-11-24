import "server-only";
import { cookies } from "next/headers";
import { dohvatiVlasnika } from "@/lib/auth";
import { fenUKm, kmUFen } from "@/lib/kalkulacija";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/utils/supabase/types";

/* Pregled prodaje (PRD §5.7, DB.md §10). Obrazac kao lib/data/predracuni.ts. */

export const PRODAJA_PO_STRANICI = 50;

/** PostgREST vraća najviše 1000 redaka po upitu (max rows). */
const BLOK_ZBROJA = 1000;

export type RedakProdaje = Pick<Tables<"predracuni">, "id" | "vrsta" | "broj" | "status" | "kupac_ime" | "ukupno"> & {
  potvrden_at: string;
};

export type StranicaProdaja = { prodaje: RedakProdaje[]; josIma: boolean };

export type ZbrojProdaje = { ukupno: number; broj: number };

type Granice = { odIso: string; doIso: string };

/**
 * Potvrđeni predračuni i brze prodaje u razdoblju (uključujući stornirane), najnovije prvo, po 50.
 * `pomak` = broj već učitanih (redoslijed po potvrden_at ne prati id, pa nema keyseta po id-u).
 */
export async function dohvatiProdaje({ odIso, doIso, pomak = 0 }: Granice & { pomak?: number }): Promise<StranicaProdaja> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("predracuni")
    .select("id, vrsta, broj, status, kupac_ime, ukupno, potvrden_at")
    .in("status", ["potvrden", "storniran"])
    .gte("potvrden_at", odIso)
    .lt("potvrden_at", doIso)
    .order("potvrden_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pomak, pomak + PRODAJA_PO_STRANICI);
  if (error) throw new Error("Prodaje se ne mogu učitati.", { cause: error });

  const prodaje = data
    .slice(0, PRODAJA_PO_STRANICI)
    .map((p) => ({ ...p, potvrden_at: p.potvrden_at ?? "" }));
  return { prodaje, josIma: data.length > PRODAJA_PO_STRANICI };
}

/** Zbroj i broj potvrđenih prodaja u razdoblju. Stornirane se ne broje. Zbraja se u feninzima. */
export async function dohvatiZbrojProdaje({ odIso, doIso }: Granice): Promise<ZbrojProdaje> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  let feninga = 0;
  let broj = 0;
  for (let pomak = 0; ; pomak += BLOK_ZBROJA) {
    const { data, error } = await supabase
      .from("predracuni")
      .select("ukupno")
      .eq("status", "potvrden")
      .gte("potvrden_at", odIso)
      .lt("potvrden_at", doIso)
      .order("id")
      .range(pomak, pomak + BLOK_ZBROJA - 1);
    if (error) throw new Error("Zbroj prodaje se ne može izračunati.", { cause: error });

    for (const { ukupno } of data) feninga += kmUFen(ukupno);
    broj += data.length;
    if (data.length < BLOK_ZBROJA) break;
  }

  return { ukupno: fenUKm(feninga), broj };
}
