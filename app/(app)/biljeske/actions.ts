"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { greskeIzZoda, type StanjeForme } from "@/lib/akcije";
import { createClient } from "@/utils/supabase/server";

const tekst = z
  .string()
  .trim()
  .min(1, "Upišite tekst bilješke.")
  .max(2000, "Bilješka je preduga (najviše 2000 znakova).");
const id = z.coerce.number().int().positive();

/** Bilješke se prikazuju i na Početnoj (otvorene). */
function osvjezi() {
  revalidatePath("/biljeske");
  revalidatePath("/");
}

export type StanjeBiljeske = StanjeForme<"tekst">;

export async function dodajBiljesku(_prethodno: StanjeBiljeske, formData: FormData): Promise<StanjeBiljeske> {
  await dohvatiVlasnika();

  const rezultat = z.object({ tekst }).safeParse({ tekst: formData.get("tekst") ?? "" });
  if (!rezultat.success) return greskeIzZoda(rezultat.error);

  const supabase = createClient(await cookies());
  const { error } = await supabase.from("biljeske").insert({ tekst: rezultat.data.tekst });
  if (error) return { greska: "Bilješka nije spremljena. Pokušajte ponovno." };

  osvjezi();
  return { uspjeh: "Bilješka je dodana." };
}

export async function urediBiljesku(_prethodno: StanjeBiljeske, formData: FormData): Promise<StanjeBiljeske> {
  await dohvatiVlasnika();

  const rezultat = z.object({ id, tekst }).safeParse({ id: formData.get("id"), tekst: formData.get("tekst") ?? "" });
  if (!rezultat.success) return greskeIzZoda(rezultat.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("biljeske")
    .update({ tekst: rezultat.data.tekst })
    .eq("id", rezultat.data.id)
    .select("id");
  if (error) return { greska: "Izmjena nije spremljena. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Bilješka više ne postoji." };

  osvjezi();
  return { uspjeh: "Bilješka je spremljena." };
}

export async function promijeniObavljeno(biljeskaId: number, obavljeno: boolean): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = z.object({ id, obavljeno: z.boolean() }).safeParse({ id: biljeskaId, obavljeno });
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("biljeske")
    .update({
      obavljeno: rezultat.data.obavljeno,
      obavljeno_at: rezultat.data.obavljeno ? new Date().toISOString() : null,
    })
    .eq("id", rezultat.data.id);
  if (error) return { greska: "Promjena nije spremljena. Pokušajte ponovno." };

  osvjezi();
  return { uspjeh: rezultat.data.obavljeno ? "Označeno kao obavljeno." : "Vraćeno među otvorene." };
}

export async function obrisiBiljesku(biljeskaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(biljeskaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { error } = await supabase.from("biljeske").delete().eq("id", rezultat.data);
  if (error) return { greska: "Bilješka nije obrisana. Pokušajte ponovno." };

  osvjezi();
  return { uspjeh: "Bilješka je obrisana." };
}
