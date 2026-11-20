"use client";

import { useId, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  oznaka: string;
  /** Oznaka samo za čitače ekrana (polje ima placeholder koji objašnjava svrhu). */
  skrivenaOznaka?: boolean;
  greska?: string;
};

/** Višeredno polje za tekst bilješke, u stilu Polje.tsx. */
export function PoljeTeksta({ oznaka, skrivenaOznaka, greska, className = "", ...props }: Props) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={skrivenaOznaka ? "sr-only" : "text-[13px] leading-[18px] font-semibold text-sivosmeda"}
      >
        {oznaka}
      </label>
      <textarea
        id={id}
        aria-invalid={greska ? true : undefined}
        aria-describedby={greska ? `${id}-greska` : undefined}
        className={`field-sizing-content min-h-24 w-full resize-none rounded-[var(--radius-polje)] border bg-povrsina px-4 py-3 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta ${
          greska ? "border-greska" : "border-rub"
        }`}
        {...props}
      />
      {greska && (
        <p id={`${id}-greska`} className="text-sm text-greska">
          {greska}
        </p>
      )}
    </div>
  );
}
