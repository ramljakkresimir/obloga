"use server";

import { cookies } from "next/headers";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export type StanjeLozinke = {
  greska?: string;
  greske?: Partial<Record<"trenutna" | "nova" | "ponovi", string>>;
  uspjeh?: string;
} | undefined;

const shemaLozinke = z
  .object({
    trenutna: z.string().min(1, "Upišite trenutnu lozinku."),
    nova: z.string().min(8, "Nova lozinka mora imati barem 8 znakova.").max(72, "Nova lozinka je preduga."),
    ponovi: z.string(),
  })
  .refine((d) => d.nova === d.ponovi, { path: ["ponovi"], message: "Lozinke se ne podudaraju." })
  .refine((d) => d.nova !== d.trenutna, { path: ["nova"], message: "Nova lozinka mora biti različita od trenutne." });

export async function promijeniLozinku(_prethodno: StanjeLozinke, formData: FormData): Promise<StanjeLozinke> {
  const vlasnik = await dohvatiVlasnika();

  const rezultat = shemaLozinke.safeParse({
    trenutna: formData.get("trenutna") ?? "",
    nova: formData.get("nova") ?? "",
    ponovi: formData.get("ponovi") ?? "",
  });
  if (!rezultat.success) {
    const greske: NonNullable<StanjeLozinke>["greske"] = {};
    for (const issue of rezultat.error.issues) {
      const polje = issue.path[0] as "trenutna" | "nova" | "ponovi";
      greske[polje] ??= issue.message;
    }
    return { greske };
  }
  const { trenutna, nova } = rezultat.data;

  // Provjera trenutne lozinke na zasebnom klijentu bez kolačića, da se ne dira sesija ovog uređaja.
  const provjera = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error: greskaProvjere } = await provjera.auth.signInWithPassword({ email: vlasnik.email, password: trenutna });
  if (greskaProvjere) {
    if (greskaProvjere.status === 429) {
      return { greska: "Previše pokušaja. Pokušajte ponovno za nekoliko minuta." };
    }
    return { greske: { trenutna: "Trenutna lozinka nije ispravna." } };
  }
  // Ukloni privremenu sesiju nastalu provjerom.
  await provjera.auth.signOut({ scope: "local" });

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    if (error.code === "weak_password") {
      return { greske: { nova: "Lozinka je preslaba. Odaberite dužu ili složeniju lozinku." } };
    }
    if (error.code === "same_password") {
      return { greske: { nova: "Nova lozinka mora biti različita od trenutne." } };
    }
    return { greska: "Lozinka nije promijenjena. Pokušajte ponovno." };
  }

  return { uspjeh: "Lozinka je promijenjena." };
}
