"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { klaseGumba, type Varijanta } from "./stiloviGumba";

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
      className={klaseGumba(varijanta, punaSirina, className)}
      {...props}
    >
      {radi && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
      {children}
    </button>
  );
}
