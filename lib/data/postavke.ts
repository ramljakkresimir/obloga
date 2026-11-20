import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { dohvatiVlasnika } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/utils/supabase/types";

/* Obrazac kao lib/data/biljeske.ts (Tech.md §7). */

export type Postavke = Omit<Tables<"postavke">, "id" | "updated_at">;

export type Kategorija = Pick<Tables<"kategorije">, "id" | "naziv" | "redoslijed"> & {
  /** Broj obloga u kategoriji (i neaktivnih) – kategorija se može obrisati samo ako je 0. */
  brojObloga: number;
};

/** Jedini red tablice postavke (podaci firme, PDV, zadana cijena ljepila). */
export const dohvatiPostavke = cache(async (): Promise<Postavke> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("postavke")
    .select("naziv_firme, adresa, mjesto, telefon, email, jib, pdv_broj, u_sustavu_pdv, cijene_sa_pdv, pdv_stopa, ljepilo_cijena")
    .eq("id", 1)
    .single();
  if (error) throw new Error("Postavke se ne mogu učitati.", { cause: error });
  return data;
});

/** Kategorije po redoslijedu, s brojem obloga. */
export const dohvatiKategorije = cache(async (): Promise<Kategorija[]> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("kategorije")
    .select("id, naziv, redoslijed, artikli(count)")
    .order("redoslijed")
    .order("id");
  if (error) throw new Error("Kategorije se ne mogu učitati.", { cause: error });

  return data.map(({ artikli, ...k }) => ({ ...k, brojObloga: artikli[0]?.count ?? 0 }));
});
