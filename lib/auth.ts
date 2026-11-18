import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { io } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type Vlasnik = {
  id: string;
  ime: string;
  email: string;
};

/**
 * Data Access Layer: trenutni prijavljeni vlasnik.
 * - nema sesije → /prijava
 * - sesija postoji, ali korisnik nije u tablici `vlasnici` → /odjava?razlog=pristup
 * Koristiti u Server Components (unutar <Suspense>) i na početku svake Server Action.
 */
export const dohvatiVlasnika = cache(async (): Promise<Vlasnik> => {
  const cookieStore = await cookies();
  // Uz Partial Prefetching se kolačići mogu pročitati i tijekom prerendera (runtime prefetch),
  // a getClaims() provjerava istek tokena preko Date.now(). io() isključuje ostatak iz prerendera.
  await io();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) {
    redirect("/prijava");
  }

  const { data: vlasnik } = await supabase
    .from("vlasnici")
    .select("user_id, ime")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (!vlasnik) {
    redirect("/odjava?razlog=pristup");
  }

  return {
    id: vlasnik.user_id,
    ime: vlasnik.ime,
    email: typeof claims.email === "string" ? claims.email : "",
  };
});
