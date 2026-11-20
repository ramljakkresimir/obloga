import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { dohvatiVlasnika } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/utils/supabase/types";

/*
 * Obrazac za lib/data/* (Tech.md §7):
 * - 'server-only', poziva se iz Server Components unutar <Suspense>;
 * - prvo dohvatiVlasnika() (provjera prijave, ne oslanja se samo na proxy i RLS);
 * - React cache() deduplicira pozive unutar jednog zahtjeva (bez 'use cache': podaci ovise o sesiji);
 * - greška upita se baca (hvata je error.tsx), ne vraća se tiho prazna lista.
 */

export type Biljeska = Pick<Tables<"biljeske">, "id" | "tekst" | "obavljeno" | "created_at">;

/** Za ILIKE: % i _ iz korisnikovog unosa tretiraju se kao obični znakovi. */
function escapeLike(tekst: string) {
  return tekst.replace(/[\\%_]/g, (z) => `\\${z}`);
}

/** Sve bilješke, neobavljene prve, novije gore. Po želji filtrirano po tekstu. */
export const dohvatiBiljeske = cache(async (pretraga?: string): Promise<Biljeska[]> => {
  await dohvatiVlasnika();
  const supabase = createClient(await cookies());

  let upit = supabase
    .from("biljeske")
    .select("id, tekst, obavljeno, created_at")
    .order("obavljeno")
    .order("created_at", { ascending: false });

  const q = pretraga?.trim();
  if (q) upit = upit.ilike("tekst", `%${escapeLike(q)}%`);

  const { data, error } = await upit;
  if (error) throw new Error("Bilješke se ne mogu učitati.", { cause: error });
  return data;
});
