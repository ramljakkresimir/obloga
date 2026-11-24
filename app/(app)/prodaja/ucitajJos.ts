"use server";

import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { dohvatiProdaje, type StranicaProdaja } from "@/lib/data/prodaja";
import { graniceUtc, razdobljeIzParametara } from "@/lib/razdoblje";

/*
 * „Učitaj još" za pregled prodaje. Zasebno od prodaja/actions.ts (brza prodaja i storno).
 * Klijent šalje točne datume prve stranice, da se razdoblje ne pomakne preko ponoći na kraju mjeseca.
 */
export async function ucitajJosProdaja(
  od: string,
  doDatum: string,
  pomak: number,
): Promise<StranicaProdaja | { greska: string }> {
  // Izvan try: redirect() na prijavu mora proći, a ne biti progutan kao greška.
  await dohvatiVlasnika();

  const rezultat = z
    .object({ od: z.string().max(10), do: z.string().max(10), pomak: z.number().int().min(1).max(100_000) })
    .safeParse({ od, do: doDatum, pomak });
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const razdoblje = razdobljeIzParametara({ r: "raspon", od: rezultat.data.od, do: rezultat.data.do }, new Date());
  if (razdoblje.vrsta !== "raspon") return { greska: "Neispravan zahtjev." };

  try {
    return await dohvatiProdaje({ ...graniceUtc(razdoblje), pomak: rezultat.data.pomak });
  } catch {
    return { greska: "Starije prodaje se ne mogu učitati. Pokušajte ponovno." };
  }
}
