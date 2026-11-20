"use client";

import { useId, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "role"> & {
  oznaka: string;
  pomoc?: string;
};

/**
 * Prekidač (switch) za uključivanje dodataka i postavki. Nativni checkbox s role="switch",
 * pa radi u formama (šalje vrijednost samo kad je uključen) i s tipkovnicom.
 */
export function Prekidac({ oznaka, pomoc, className = "", disabled, ...props }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex min-h-12 cursor-pointer items-center justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      <span className="flex flex-col">
        <span className="font-semibold text-tekst">{oznaka}</span>
        {pomoc && (
          <span id={`${id}-pomoc`} className="text-sm text-sivosmeda">
            {pomoc}
          </span>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          disabled={disabled}
          aria-describedby={pomoc ? `${id}-pomoc` : undefined}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden
          className="h-7 w-12 rounded-full bg-rub transition-colors peer-checked:bg-espresso peer-focus-visible:ring-2 peer-focus-visible:ring-narancasta peer-focus-visible:ring-offset-2"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-6 rounded-full bg-povrsina shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
