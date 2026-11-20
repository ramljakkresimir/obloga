// Formatiranje i parsiranje za hr prikaz (Tech.md §9). Čiste funkcije: rade isto na serveru i u pregledniku.

const ZONA = "Europe/Sarajevo";

const fmtKM = new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtM2 = new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// Dijelovi datuma u zoni Sarajeva; sam zapis slažemo ručno jer hr-HR u ICU-u dodaje vodeće nule ("05. 01.").
const fmtDijelovi = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, day: "numeric", month: "numeric", year: "numeric" });

/** Intl koristi NBSP / uski NBSP i ASCII minus; za prikaz ih normaliziramo. */
function ocisti(tekst: string): string {
  return tekst.replace(/[  ]/g, " ").replace(/^-/, "−");
}

/** Iznos u KM (kako je spremljen u bazi, npr. 1234.5) → "1.234,50 KM". */
export function formatKM(km: number): string {
  // Izbjegni "−0,00 KM" za -0 i sitne negativne ostatke.
  const vrijednost = Math.abs(km) < 0.005 ? 0 : km;
  return `${ocisti(fmtKM.format(vrijednost))} KM`;
}

/** Površina → "12,5 m²" (najviše 2 decimale, bez suvišnih nula). */
export function formatM2(m2: number): string {
  const vrijednost = Math.abs(m2) < 0.005 ? 0 : m2;
  return `${ocisti(fmtM2.format(vrijednost))} m²`;
}

/**
 * Tekst iz polja → broj. Prihvaća zarez i točku: zadnji separator je decimalni,
 * raniji su tisućice ("1.234,50" → 1234.5). Razmaci se odbacuju.
 * Prazno ili neispravno → null.
 */
export function parseBroj(tekst: string | null | undefined): number | null {
  if (tekst == null) return null;
  let s = String(tekst).replace(/[\s  ]/g, "").replace(/^−/, "-");
  if (s === "") return null;

  const zadnji = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (zadnji !== -1) {
    const cijeli = s.slice(0, zadnji).replace(/[.,]/g, "");
    const decimale = s.slice(zadnji + 1);
    s = `${cijeli}.${decimale}`;
  }

  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const broj = Number(s);
  return Number.isFinite(broj) ? broj : null;
}

function dijeloviDatuma(d: Date | string) {
  const datum = d instanceof Date ? d : new Date(d);
  const dijelovi = fmtDijelovi.formatToParts(datum);
  const uzmi = (tip: Intl.DateTimeFormatPartTypes) => Number(dijelovi.find((p) => p.type === tip)?.value);
  return { dan: uzmi("day"), mjesec: uzmi("month"), godina: uzmi("year") };
}

/** Datum u zoni Europe/Sarajevo → "18. 11. 2026." (bez vodećih nula: "5. 1. 2026."). */
export function formatDatum(d: Date | string): string {
  const { dan, mjesec, godina } = dijeloviDatuma(d);
  return `${dan}. ${mjesec}. ${godina}.`;
}

/** Kratki datum bez godine → "18. 11.". */
export function formatDatumKratko(d: Date | string): string {
  const { dan, mjesec } = dijeloviDatuma(d);
  return `${dan}. ${mjesec}.`;
}

/**
 * Broj s imenicom u ispravnom obliku: 1 obloga, 2–4 obloge, 5+ obloga (21 obloga, 22 obloge, 12 obloga).
 * Oblici: [jednina, 2–4, ostalo], npr. ["obloga", "obloge", "obloga"].
 */
export function brojSImenicom(n: number, [jedan, dva, pet]: readonly [string, string, string]): string {
  const zadnja = n % 10;
  const zadnjeDvije = n % 100;
  const oblik =
    zadnja === 1 && zadnjeDvije !== 11 ? jedan : zadnja >= 2 && zadnja <= 4 && (zadnjeDvije < 12 || zadnjeDvije > 14) ? dva : pet;
  return `${n} ${oblik}`;
}

export const OBLIK_OBLOGA = ["obloga", "obloge", "obloga"] as const;
