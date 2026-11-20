"use client";

import { useId, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import { parseBroj } from "@/lib/format";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "inputMode" | "defaultValue" | "value"> & {
  oznaka: string;
  /** Jedinica kao sufiks unutar polja: "KM", "m²", "kom". */
  jedinica?: string;
  /** Dopušta decimale (tipkovnica s zarezom). Bez toga: samo cijeli brojevi. */
  decimalno?: boolean;
  /** Gumbi − / + sa strane (za komade). Korak je 1. */
  koraci?: boolean;
  /** Najmanja vrijednost koju gumb − može postaviti. */
  najmanje?: number;
  defaultValue?: number | string | null;
  greska?: string;
  pomoc?: string;
};

function uTekst(vrijednost: Props["defaultValue"]): string {
  if (vrijednost == null || vrijednost === "") return "";
  return typeof vrijednost === "number" ? String(vrijednost).replace(".", ",") : vrijednost;
}

/**
 * Brojčano polje. Šalje sirovi tekst ("12,5") u formu; server ga parsira s parseBroj (zBroj u zod shemi).
 * type="text" + inputMode, jer type="number" ne radi pouzdano sa zarezom na mobitelima.
 */
export function BrojPolje({
  oznaka,
  jedinica,
  decimalno,
  koraci,
  najmanje,
  defaultValue,
  greska,
  pomoc,
  className = "",
  onChange,
  disabled,
  ...props
}: Props) {
  const id = useId();
  const [tekst, setTekst] = useState(() => uTekst(defaultValue));
  const opisId = greska ? `${id}-greska` : pomoc ? `${id}-pomoc` : undefined;

  function promijeni(e: ChangeEvent<HTMLInputElement>) {
    setTekst(e.target.value);
    onChange?.(e);
  }

  function korak(smjer: 1 | -1) {
    const trenutno = parseBroj(tekst) ?? 0;
    let novo = Math.round(trenutno) + smjer;
    if (najmanje !== undefined) novo = Math.max(najmanje, novo);
    setTekst(String(novo));
  }

  const gumbKoraka =
    "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-polje)] border border-rub bg-povrsina text-espresso hover:bg-pozadina active:bg-rub/60 disabled:opacity-60";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold text-sivosmeda">
        {oznaka}
      </label>
      <div className="flex items-center gap-2">
        {koraci && (
          <button type="button" onClick={() => korak(-1)} disabled={disabled} aria-label={`Smanji: ${oznaka}`} className={gumbKoraka}>
            <Minus aria-hidden className="size-5" />
          </button>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            inputMode={decimalno ? "decimal" : "numeric"}
            autoComplete="off"
            value={tekst}
            onChange={promijeni}
            disabled={disabled}
            aria-invalid={greska ? true : undefined}
            aria-describedby={opisId}
            className={`h-12 w-full rounded-[var(--radius-polje)] border bg-povrsina px-4 text-right font-naslov text-lg font-semibold text-tekst tabular-nums placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta disabled:bg-pozadina ${
              greska ? "border-greska" : "border-rub"
            } ${jedinica ? "pr-14" : ""}`}
            {...props}
          />
          {jedinica && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-center text-sm font-semibold text-sivosmeda"
            >
              {jedinica}
            </span>
          )}
        </div>
        {koraci && (
          <button type="button" onClick={() => korak(1)} disabled={disabled} aria-label={`Povećaj: ${oznaka}`} className={gumbKoraka}>
            <Plus aria-hidden className="size-5" />
          </button>
        )}
      </div>
      {greska ? (
        <p id={`${id}-greska`} className="text-sm text-greska">
          {greska}
        </p>
      ) : pomoc ? (
        <p id={`${id}-pomoc`} className="text-sm text-sivosmeda">
          {pomoc}
        </p>
      ) : null}
    </div>
  );
}
