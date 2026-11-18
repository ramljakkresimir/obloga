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
  return STAVKE_NAVIGACIJE.find((s) => jeAktivna(s.href, pathname))?.naziv ?? "Obloga.ba";
}
