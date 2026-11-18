"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

type Varijanta = "primarni" | "sekundarni" | "naglasni" | "opasni" | "tekstualni" | "opasni-tekstualni";

const stilovi: Record<Varijanta, string> = {
  primarni: "bg-espresso text-white hover:bg-smeda active:bg-smeda",
  sekundarni: "bg-povrsina text-espresso border border-espresso hover:bg-pozadina",
  naglasni: "bg-narancasta text-espresso hover:bg-jantar",
  opasni: "bg-povrsina text-greska border border-greska hover:bg-greska-pozadina",
  tekstualni: "text-espresso hover:bg-rub/50",
  "opasni-tekstualni": "text-greska hover:bg-greska-pozadina",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  varijanta?: Varijanta;
  /** Prikaži spinner. Za submit gumbe unutar <form> spinner se prikazuje automatski. */
  ucitavanje?: boolean;
  punaSirina?: boolean;
};

export function Gumb({
  varijanta = "primarni",
  ucitavanje,
  punaSirina,
  className = "",
  children,
  type = "button",
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  const radi = ucitavanje ?? (type === "submit" && pending);

  return (
    <button
      type={type}
      disabled={disabled || radi}
      aria-busy={radi || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-polje)] px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${stilovi[varijanta]} ${punaSirina ? "w-full" : ""} ${className}`}
      {...props}
    >
      {radi && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
      {children}
    </button>
  );
}
