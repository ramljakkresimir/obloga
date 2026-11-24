"use client";

type Opcija<T extends string> = { vrijednost: T; naziv: string; onemogucena?: boolean };

type Props<T extends string> = {
  /** Naziv grupe za čitače ekrana, npr. „Jedinica: WPC hrast". */
  oznaka: string;
  opcije: Opcija<T>[];
  vrijednost: T;
  onPromjena: (vrijednost: T) => void;
  disabled?: boolean;
  className?: string;
};

/** Segmentni prekidač s 2–3 opcije (m² | kom, % | KM). Dodirna visina 48 px. */
export function Segment<T extends string>({ oznaka, opcije, vrijednost, onPromjena, disabled, className = "" }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={oznaka}
      className={`inline-flex h-12 shrink-0 rounded-[var(--radius-polje)] border border-rub bg-pozadina p-1 ${className}`}
    >
      {opcije.map((o) => {
        const odabrana = o.vrijednost === vrijednost;
        return (
          <button
            key={o.vrijednost}
            type="button"
            role="radio"
            aria-checked={odabrana}
            disabled={disabled || o.onemogucena}
            onClick={() => onPromjena(o.vrijednost)}
            className={`min-w-12 flex-1 rounded-[calc(var(--radius-polje)-4px)] px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-narancasta focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              odabrana ? "bg-espresso text-white shadow-sm" : "text-sivosmeda hover:text-espresso"
            }`}
          >
            {o.naziv}
          </button>
        );
      })}
    </div>
  );
}
