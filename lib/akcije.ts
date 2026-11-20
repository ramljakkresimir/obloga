import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { parseBroj } from "@/lib/format";
import { KOLACIC_OBAVIJEST } from "@/lib/sesija";

/*
 * Zajednički dijelovi za Server Actions (Tech.md §7). Svaka akcija ostaje eksplicitna:
 *
 *   1. await dohvatiVlasnika()                       // provjera prijave i vlasnika (DAL)
 *   2. shema.safeParse(...) → greskeIzZoda(error)    // validacija, poruke na hrvatskom
 *   3. supabase.from(...) / supabase.rpc(...)        // upis; greška → { greska: '...' }
 *   4. revalidatePath(...)                           // osvježavanje pogođenih ruta
 *   5. return { uspjeh } ili postaviObavijest(...) + redirect(...) (redirect uvijek zadnji)
 */

/** Stanje forme koje akcija vraća u useActionState. P = nazivi polja. */
export type StanjeForme<P extends string = string> =
  | {
      greska?: string;
      greske?: Partial<Record<P, string>>;
      uspjeh?: string;
    }
  | undefined;

/** Zod greške → { greske: { polje: 'prva poruka' } }. */
export function greskeIzZoda<P extends string>(error: z.ZodError): NonNullable<StanjeForme<P>> {
  const greske: Partial<Record<P, string>> = {};
  for (const issue of error.issues) {
    const polje = issue.path[0];
    if (typeof polje !== "string") continue;
    greske[polje as P] ??= issue.message;
  }
  if (Object.keys(greske).length === 0) {
    return { greska: error.issues[0]?.message ?? "Provjerite unesene podatke." };
  }
  return { greske };
}

/** Broj iz tekstualnog polja (zarez ili točka, vidi parseBroj). Prazno ili neispravno → greška. */
export const zBroj = z.string().transform((tekst, ctx) => {
  const broj = parseBroj(tekst);
  if (broj === null) {
    ctx.addIssue({ code: "custom", message: "Upišite ispravan broj." });
    return z.NEVER;
  }
  return broj;
});

export type VrstaObavijesti = "uspjeh" | "greska";

/**
 * Poruka za obavijest na sljedećoj stranici, kad akcija završava s redirect().
 * Bez redirecta je jednostavnije vratiti { uspjeh } i prikazati obavijest u klijentu.
 */
export async function postaviObavijest(tekst: string, vrsta: VrstaObavijesti = "uspjeh") {
  const cookieStore = await cookies();
  cookieStore.set(KOLACIC_OBAVIJEST, JSON.stringify({ tekst, vrsta }), {
    httpOnly: false, // čita ga ObavijestProvider u pregledniku
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
}
