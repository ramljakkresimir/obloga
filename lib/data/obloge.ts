import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { dohvatiVlasnika } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Enums, Tables } from "@/utils/supabase/types";

/* Obrazac kao lib/data/biljeske.ts (Tech.md §7). */

export type Obloga = Pick<
  Tables<"artikli">,
  "id" | "naziv" | "slika" | "kategorija_id" | "stanje" | "min_stanje" | "m2_po_komadu" | "cijena_kom" | "aktivan"
>;

export type OblogaDetalji = Omit<Tables<"artikli">, "created_at" | "updated_at"> & { kategorija: string | null };

export type Kretanje = {
  id: number;
  created_at: string;
  tip: Enums<"tip_kretanja">;
  promjena: number;
  napomena: string | null;
  predracun: { id: number; broj: string | null; vrsta: Enums<"vrsta_prodaje"> } | null;
  vlasnik: string | null;
  /** Samo za ulaz: postoji poništenje tog ulaza. */
  ponisten: boolean;
};

export type StranicaKretanja = { kretanja: Kretanje[]; josIma: boolean };

export const KRETANJA_PO_STRANICI = 50;

/** id obloge iz URL-a (/obloge/[id]) → pozitivan cijeli broj, inače 404. */
export function idIzParametra(id: string): number {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) notFound();
  return n;
}

const STUPCI_LISTE = "id, naziv, slika, kategorija_id, stanje, min_stanje, m2_po_komadu, cijena_kom, aktivan";

/**
 * Sve obloge (aktivne i arhivirane; ima ih desetak do stotinjak), poredane po redoslijedu
 * kategorija iz Postavki, pa po nazivu. Filtriranje i pretraga rade se u pregledniku.
 */
export const dohvatiObloge = cache(async (): Promise<Obloga[]> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const [obloge, kategorije] = await Promise.all([
    supabase.from("artikli").select(STUPCI_LISTE),
    supabase.from("kategorije").select("id").order("redoslijed").order("id"),
  ]);
  if (obloge.error) throw new Error("Obloge se ne mogu učitati.", { cause: obloge.error });
  if (kategorije.error) throw new Error("Kategorije se ne mogu učitati.", { cause: kategorije.error });

  const poredak = new Map(kategorije.data.map((k, i) => [k.id, i]));
  return obloge.data.sort(
    (a, b) =>
      (poredak.get(a.kategorija_id) ?? Infinity) - (poredak.get(b.kategorija_id) ?? Infinity) ||
      a.naziv.localeCompare(b.naziv, "hr"),
  );
});

/** Jedna obloga s nazivom kategorije. Ne postoji → null (stranica poziva notFound()). */
export const dohvatiOblogu = cache(async (id: number): Promise<OblogaDetalji | null> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("artikli")
    .select(
      "id, naziv, slika, kategorija_id, sirina_cm, duzina_cm, m2_po_komadu, cijena_kom, stanje, min_stanje, aktivan, kategorije(naziv)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Obloga se ne može učitati.", { cause: error });
  if (!data) return null;

  const { kategorije, ...obloga } = data;
  return { ...obloga, kategorija: kategorije?.naziv ?? null };
});

/**
 * Smije li se obloga trajno obrisati: nikad nije bila u predračunu ni u prodaji.
 * Samo za prikaz gumba; pravilo uvijek provjerava i RPC obrisi_oblogu.
 */
export async function mozeSeObrisati(artiklId: number): Promise<boolean> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const [stavke, prodaje] = await Promise.all([
    supabase.from("predracun_stavke").select("id", { count: "exact", head: true }).eq("artikl_id", artiklId),
    supabase
      .from("kretanja_stanja")
      .select("id", { count: "exact", head: true })
      .eq("artikl_id", artiklId)
      .in("tip", ["predracun", "brza_prodaja", "storno"]),
  ]);
  if (stavke.error || prodaje.error) {
    throw new Error("Obloga se ne može učitati.", { cause: stavke.error ?? prodaje.error });
  }
  return (stavke.count ?? 0) === 0 && (prodaje.count ?? 0) === 0;
}

/**
 * Povijest kretanja obloge, najnovije prvo, po 50. `prijeId` = id zadnjeg već prikazanog
 * kretanja (keyset: id raste s vremenom upisa).
 */
export async function dohvatiKretanja(artiklId: number, prijeId?: number): Promise<StranicaKretanja> {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  let upit = supabase
    .from("kretanja_stanja")
    .select("id, created_at, tip, promjena, napomena, predracuni(id, broj, vrsta), vlasnici(ime)")
    .eq("artikl_id", artiklId)
    .order("id", { ascending: false })
    .limit(KRETANJA_PO_STRANICI + 1);
  if (prijeId) upit = upit.lt("id", prijeId);

  const { data, error } = await upit;
  if (error) throw new Error("Povijest kretanja se ne može učitati.", { cause: error });

  const josIma = data.length > KRETANJA_PO_STRANICI;
  const stranica = data.slice(0, KRETANJA_PO_STRANICI);

  // Koji su od prikazanih ulaza već poništeni (poništenje može biti i na drugoj stranici povijesti).
  const ulazi = stranica.filter((k) => k.tip === "ulaz").map((k) => k.id);
  const ponisteni = new Set<number>();
  if (ulazi.length > 0) {
    const { data: ponistenja, error: greska } = await supabase
      .from("kretanja_stanja")
      .select("ponistava_id")
      .in("ponistava_id", ulazi);
    if (greska) throw new Error("Povijest kretanja se ne može učitati.", { cause: greska });
    for (const p of ponistenja) if (p.ponistava_id) ponisteni.add(p.ponistava_id);
  }

  return {
    josIma,
    kretanja: stranica.map((k) => ({
      id: k.id,
      created_at: k.created_at,
      tip: k.tip,
      promjena: k.promjena,
      napomena: k.napomena,
      predracun: k.predracuni,
      vlasnik: k.vlasnici?.ime ?? null,
      ponisten: ponisteni.has(k.id),
    })),
  };
}
