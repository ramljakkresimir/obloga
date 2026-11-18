"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  oznaka: string;
  greska?: string;
  pomoc?: string;
};

/** Polje s oznakom iznad, pomoćnim tekstom i porukom o grešci. Za type="password" dodaje gumb s okom. */
export function Polje({ oznaka, greska, pomoc, type = "text", className = "", ...props }: Props) {
  const id = useId();
  const [vidljivo, setVidljivo] = useState(false);
  const jeLozinka = type === "password";
  const opisId = greska ? `${id}-greska` : pomoc ? `${id}-pomoc` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold text-sivosmeda">
        {oznaka}
      </label>
      <div className="relative">
        <input
          id={id}
          type={jeLozinka && vidljivo ? "text" : type}
          aria-invalid={greska ? true : undefined}
          aria-describedby={opisId}
          className={`h-12 w-full rounded-[var(--radius-polje)] border bg-povrsina px-4 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta focus-visible:outline-none ${
            greska ? "border-greska" : "border-rub"
          } ${jeLozinka ? "pr-12" : ""}`}
          {...props}
        />
        {jeLozinka && (
          <button
            type="button"
            onClick={() => setVidljivo((v) => !v)}
            aria-label={vidljivo ? "Sakrij lozinku" : "Prikaži lozinku"}
            aria-pressed={vidljivo}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-polje)] text-sivosmeda hover:text-espresso"
          >
            {vidljivo ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
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
