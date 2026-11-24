// Razdoblje za pregled prodaje (PRD §5.7, DB.md §10): granice se računaju u zoni Europe/Sarajevo.
// Čiste funkcije: rade isto na serveru i u pregledniku.

const ZONA = "Europe/Sarajevo";

export type VrstaRazdoblja = "ovaj" | "prosli" | "raspon";

/** `od` i `do` su lokalni datumi "YYYY-MM-DD"; `do` je uključiv. */
export type Razdoblje = { vrsta: VrstaRazdoblja; od: string; do: string };

export const OPCIJE_RAZDOBLJA: { vrijednost: VrstaRazdoblja; naziv: string }[] = [
  { vrijednost: "ovaj", naziv: "Ovaj mjesec" },
  { vrijednost: "prosli", naziv: "Prošli mjesec" },
  { vrijednost: "raspon", naziv: "Od–do" },
];

const MJESECI = [
  "Siječanj",
  "Veljača",
  "Ožujak",
  "Travanj",
  "Svibanj",
  "Lipanj",
  "Srpanj",
  "Kolovoz",
  "Rujan",
  "Listopad",
  "Studeni",
  "Prosinac",
];

const fmtZona = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

type Dan = { g: number; m: number; d: number };

function dijeloviUZoni(trenutak: number) {
  const dijelovi = fmtZona.formatToParts(new Date(trenutak));
  const uzmi = (tip: Intl.DateTimeFormatPartTypes) => Number(dijelovi.find((p) => p.type === tip)?.value);
  return { g: uzmi("year"), m: uzmi("month"), d: uzmi("day"), h: uzmi("hour"), min: uzmi("minute"), s: uzmi("second") };
}

const dvije = (n: number) => String(n).padStart(2, "0");
const uTekst = ({ g, m, d }: Dan) => `${g}-${dvije(m)}-${dvije(d)}`;

/** "YYYY-MM-DD" → dan, samo ako je stvaran datum (npr. ne 2026-02-30). */
function procitajDatum(tekst: unknown): Dan | null {
  if (typeof tekst !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tekst)) return null;
  const [g, m, d] = tekst.split("-").map(Number);
  const provjera = new Date(Date.UTC(g, m - 1, d));
  if (provjera.getUTCFullYear() !== g || provjera.getUTCMonth() !== m - 1 || provjera.getUTCDate() !== d) return null;
  if (g < 2000 || g > 2100) return null;
  return { g, m, d };
}

/** Dan pomaknut za `n` dana (kalendarski, bez zone). */
function pomakniDan({ g, m, d }: Dan, n: number): Dan {
  const t = new Date(Date.UTC(g, m - 1, d + n));
  return { g: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function mjesec(g: number, m: number): { od: string; do: string } {
  const zadnji = new Date(Date.UTC(g, m, 0)).getUTCDate();
  return { od: uTekst({ g, m, d: 1 }), do: uTekst({ g, m, d: zadnji }) };
}

/** Pomak zone (lokalno − UTC) u ms za dani trenutak. */
function pomakZone(trenutak: number): number {
  const sekunde = Math.floor(trenutak / 1000) * 1000;
  const p = dijeloviUZoni(sekunde);
  return Date.UTC(p.g, p.m - 1, p.d, p.h, p.min, p.s) - sekunde;
}

/** Lokalna ponoć dana u Sarajevu kao UTC trenutak. Ponoć uvijek postoji (DST se mijenja u 2/3 h). */
function ponocUZoni(dan: Dan): Date {
  const kaoUtc = Date.UTC(dan.g, dan.m - 1, dan.d);
  const prva = kaoUtc - pomakZone(kaoUtc);
  return new Date(kaoUtc - pomakZone(prva));
}

/**
 * URL parametri (?r=prosli ili ?r=raspon&od=2026-11-01&do=2026-11-15) → razdoblje.
 * Bez parametara, neispravno ili od > do → ovaj mjesec (prema `sada` u zoni Sarajeva).
 */
export function razdobljeIzParametara(p: { r?: unknown; od?: unknown; do?: unknown }, sada: Date): Razdoblje {
  const danas = dijeloviUZoni(sada.getTime());

  if (p.r === "raspon") {
    const od = procitajDatum(p.od);
    const doDan = procitajDatum(p.do);
    if (od && doDan && uTekst(od) <= uTekst(doDan)) return { vrsta: "raspon", od: uTekst(od), do: uTekst(doDan) };
  }

  if (p.r === "prosli") {
    const g = danas.m === 1 ? danas.g - 1 : danas.g;
    const m = danas.m === 1 ? 12 : danas.m - 1;
    return { vrsta: "prosli", ...mjesec(g, m) };
  }

  return { vrsta: "ovaj", ...mjesec(danas.g, danas.m) };
}

/** Razdoblje → URL parametri. Ovaj mjesec (zadano) nema parametara. */
export function parametriRazdoblja(r: Razdoblje): URLSearchParams {
  const params = new URLSearchParams();
  if (r.vrsta === "prosli") params.set("r", "prosli");
  if (r.vrsta === "raspon") {
    params.set("r", "raspon");
    params.set("od", r.od);
    params.set("do", r.do);
  }
  return params;
}

/** Granice za upit: `potvrden_at >= odIso and potvrden_at < doIso` (ponoć dana nakon `do`). */
export function graniceUtc(r: Pick<Razdoblje, "od" | "do">): { odIso: string; doIso: string } {
  const od = procitajDatum(r.od);
  const doDan = procitajDatum(r.do);
  if (!od || !doDan) throw new Error("Neispravno razdoblje.");
  return { odIso: ponocUZoni(od).toISOString(), doIso: ponocUZoni(pomakniDan(doDan, 1)).toISOString() };
}

function datumKratko(tekst: string): string {
  const { g, m, d } = procitajDatum(tekst)!;
  return `${d}. ${m}. ${g}.`;
}

/** „Studeni 2026." za mjesec, „1. 11. 2026. – 15. 11. 2026." za raspon. */
export function naslovRazdoblja(r: Razdoblje): string {
  if (r.vrsta !== "raspon") {
    const { g, m } = procitajDatum(r.od)!;
    return `${MJESECI[m - 1]} ${g}.`;
  }
  return r.od === r.do ? datumKratko(r.od) : `${datumKratko(r.od)} – ${datumKratko(r.do)}`;
}
