"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  oznaka: string;
  greska?: string;
  pomoc?: string;
};

/** Nativni odabir (select) u stilu Polje.tsx; na mobitelu otvara sistemski izbornik. */
export function Odabir({ oznaka, greska, pomoc, className = "", children, ...props }: Props) {
  const id = useId();
  const opisId = greska ? `${id}-greska` : pomoc ? `${id}-pomoc` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold text-sivosmeda">
        {oznaka}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={greska ? true : undefined}
          aria-describedby={opisId}
          className={`h-12 w-full appearance-none rounded-[var(--radius-polje)] border bg-povrsina pr-12 pl-4 text-base text-tekst focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta ${
            greska ? "border-greska" : "border-rub"
          }`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-sivosmeda"
        />
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
