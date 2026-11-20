import Image from "next/image";
import { inicijali } from "@/lib/obloge";
import { jeStorageSlika, slikaUrl } from "@/lib/slike";

type Props = {
  slika: string | null;
  naziv: string;
  /** cover = kartica (obreže sredinu), contain = detalji (cijela slika). */
  prikaz?: "cover" | "contain";
  sizes: string;
  priority?: boolean;
  /** Veličina inicijala kad nema slike. */
  velikiInicijali?: boolean;
};

/**
 * Slika obloge koja ispunjava roditelja (roditelj mora biti `relative` s visinom/omjerom).
 * Slike iz Storagea su već smanjene u pregledniku, pa idu `unoptimized` (štedi kvotu Vercela).
 * Bez slike: neutralni placeholder s inicijalima.
 */
export function SlikaObloge({ slika, naziv, prikaz = "cover", sizes, priority, velikiInicijali }: Props) {
  const url = slikaUrl(slika);

  if (!url) {
    return (
      <div
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center bg-pijesak-svijetli font-naslov font-semibold text-drvo ${
          velikiInicijali ? "text-6xl" : "text-3xl"
        }`}
      >
        {inicijali(naziv)}
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={naziv}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={jeStorageSlika(slika)}
      className={prikaz === "cover" ? "object-cover" : "object-contain"}
    />
  );
}
