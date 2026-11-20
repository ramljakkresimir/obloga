// Čista pravila za obloge (bez ovisnosti): oznaka stanja, m² po komadu, cijena po m², pretraga.

export type VrstaStanja = "nisko" | "minus" | "nema";

/**
 * Oznaka stanja obloge:
 * - stanje < 0 → "minus" (crveno),
 * - stanje = 0 → "nema" (sivo),
 * - 0 < stanje ≤ min_stanje → "nisko" (jantar),
 * - inače bez oznake.
 */
export function vrstaStanja(stanje: number, minStanje: number): VrstaStanja | null {
  if (stanje < 0) return "minus";
  if (stanje === 0) return "nema";
  if (stanje <= minStanje) return "nisko";
  return null;
}

/** m² po komadu iz dimenzija u cm (0,448 za 16 × 280), na 4 decimale. Bez obje dimenzije → null. */
export function m2IzDimenzija(sirinaCm: number | null, duzinaCm: number | null): number | null {
  if (!sirinaCm || !duzinaCm || sirinaCm <= 0 || duzinaCm <= 0) return null;
  // cm² → m² (÷ 10 000), zaokruženo na 4 decimale (numeric(10,4) u bazi).
  return Math.round(sirinaCm * duzinaCm) / 10000;
}

/** Cijena po m² = cijena/kom ÷ m² po komadu (samo prikaz). Bez m² → null. */
export function cijenaPoM2(cijenaKom: number, m2PoKomadu: number | null): number | null {
  if (!m2PoKomadu || m2PoKomadu <= 0) return null;
  return cijenaKom / m2PoKomadu;
}

/** Tekst za pretragu: mala slova, bez dijakritika (č → c, đ → d), da „zuti" nađe „Žuti". */
export function normalizirajZaPretragu(tekst: string): string {
  return tekst.toLocaleLowerCase("hr").replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "").trim();
}

/** Inicijali za oblogu bez slike: „WPC panel – Svijetli hrast" → „WP". */
export function inicijali(naziv: string): string {
  const rijeci = naziv.split(/[\s–—-]+/).filter((r) => /\p{L}|\d/u.test(r));
  const slova = rijeci.slice(0, 2).map((r) => [...r][0] ?? "");
  return slova.join("").toLocaleUpperCase("hr") || "?";
}
