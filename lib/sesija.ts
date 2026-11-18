// Zajedničke postavke sesije. Koriste ih proxy, akcije prijave/odjave i /odjava.

/** Klizni kolačić: dok postoji, vlasnik je "aktivan" na ovom uređaju. */
export const KOLACIC_AKTIVNOST = "zadnja_aktivnost";

/** Nakon ovoliko sekundi bez otvaranja aplikacije slijedi odjava (PRD §5.1). */
export const SEDAM_DANA = 60 * 60 * 24 * 7;

export const opcijeKolacicaAktivnosti = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SEDAM_DANA,
};

/** Razlozi zbog kojih je korisnik vraćen na prijavu (?razlog=...). */
export type RazlogOdjave = "neaktivnost" | "pristup";

/** Dopušta samo relativne putanje unutar aplikacije (sprječava open redirect). */
export function sigurnaPutanja(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/prijava") || next.startsWith("/odjava")) return "/";
  return next;
}
