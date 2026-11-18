"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { KOLACIC_AKTIVNOST, opcijeKolacicaAktivnosti, sigurnaPutanja } from "@/lib/sesija";

export type StanjePrijave = { greska?: string; email?: string } | undefined;

const shemaPrijave = z.object({
  email: z.string().trim().toLowerCase().email("Upišite ispravnu email adresu."),
  lozinka: z.string().min(1, "Upišite lozinku."),
});

export async function prijava(_prethodno: StanjePrijave, formData: FormData): Promise<StanjePrijave> {
  const email = String(formData.get("email") ?? "");
  const rezultat = shemaPrijave.safeParse({ email, lozinka: formData.get("lozinka") });
  if (!rezultat.success) {
    return { greska: rezultat.error.issues[0]?.message ?? "Provjerite podatke.", email };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: rezultat.data.email,
    password: rezultat.data.lozinka,
  });

  if (error || !data.user) {
    if (error?.status === 429) {
      return { greska: "Previše pokušaja. Pokušajte ponovno za nekoliko minuta.", email };
    }
    if (error?.code === "invalid_credentials" || error?.status === 400) {
      return { greska: "Pogrešan email ili lozinka.", email };
    }
    return { greska: "Nešto nije u redu. Pokušajte ponovno.", email };
  }

  // Samo korisnici upisani u `vlasnici` smiju koristiti aplikaciju.
  const { data: vlasnik, error: greskaVlasnika } = await supabase
    .from("vlasnici")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (greskaVlasnika || !vlasnik) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      greska: greskaVlasnika ? "Nešto nije u redu. Pokušajte ponovno." : "Ovaj nalog nema pristup aplikaciji.",
      email,
    };
  }

  cookieStore.set(KOLACIC_AKTIVNOST, String(Date.now()), opcijeKolacicaAktivnosti);
  redirect(sigurnaPutanja(formData.get("next")));
}

export async function odjava() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut({ scope: "local" });
  cookieStore.delete(KOLACIC_AKTIVNOST);
  redirect("/prijava");
}
