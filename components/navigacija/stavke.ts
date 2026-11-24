import { FileText, House, LayoutGrid, NotebookPen, Receipt, type LucideIcon } from "lucide-react";

export type StavkaNavigacije = { href: string; naziv: string; ikona: LucideIcon };

export const STAVKE_NAVIGACIJE: StavkaNavigacije[] = [
  { href: "/", naziv: "Početna", ikona: House },
  { href: "/obloge", naziv: "Obloge", ikona: LayoutGrid },
  { href: "/predracuni", naziv: "Predračuni", ikona: FileText },
  { href: "/prodaja", naziv: "Prodaja", ikona: Receipt },
  { href: "/biljeske", naziv: "Bilješke", ikona: NotebookPen },
];

export function jeAktivna(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Naslov ekrana za zaglavlje prema putanji. */
export function naslovZaPutanju(pathname: string) {
  if (pathname.startsWith("/postavke")) return "Postavke";
  if (pathname === "/obloge/nova") return "Nova obloga";
  if (pathname === "/obloge/ulaz") return "Ulaz robe";
  if (/^\/obloge\/[^/]+\/uredi$/.test(pathname)) return "Uredi oblogu";
  if (/^\/obloge\/[^/]+$/.test(pathname)) return "Obloga";
  return STAVKE_NAVIGACIJE.find((s) => jeAktivna(s.href, pathname))?.naziv ?? "Obloga.ba";
}

/**
 * Kamo vodi „Natrag" u zaglavlju: roditeljska putanja pod-ekrana
 * (/obloge/5/uredi → /obloge/5, /obloge/nova → /obloge; iznimka /obloge/ulaz → /).
 * Glavni ekrani nemaju „Natrag" (null).
 */
export function roditeljPutanje(pathname: string): string | null {
  // Ulaz robe se otvara s Početne (brza akcija), pa se na nju i vraća.
  if (pathname === "/obloge/ulaz") return "/";
  const dijelovi = pathname.split("/").filter(Boolean);
  if (dijelovi.length < 2) return null;
  return `/${dijelovi.slice(0, -1).join("/")}`;
}
