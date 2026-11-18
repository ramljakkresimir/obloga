"use client";

import { useActionState } from "react";
import { prijava, type StanjePrijave } from "./actions";
import { Gumb } from "@/components/ui/Gumb";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";
import type { RazlogOdjave } from "@/lib/sesija";

const porukeRazloga: Record<RazlogOdjave, string> = {
  neaktivnost: "Odjavljeni ste jer aplikacija nije otvarana 7 dana. Prijavite se ponovno.",
  pristup: "Ovaj nalog nema pristup aplikaciji.",
};

export function FormaPrijave({ razlog, next }: { razlog?: RazlogOdjave; next?: string }) {
  const [stanje, akcija] = useActionState<StanjePrijave, FormData>(prijava, undefined);

  return (
    <form action={akcija} className="flex flex-col gap-4" noValidate>
      {stanje?.greska ? (
        <Poruka vrsta="greska">{stanje.greska}</Poruka>
      ) : razlog ? (
        <Poruka vrsta={razlog === "pristup" ? "greska" : "info"}>{porukeRazloga[razlog]}</Poruka>
      ) : null}

      {next && <input type="hidden" name="next" value={next} />}

      <Polje
        oznaka="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={stanje?.email}
        key={stanje?.email}
      />
      <Polje oznaka="Lozinka" name="lozinka" type="password" autoComplete="current-password" required />

      <Gumb type="submit" punaSirina className="mt-2 min-h-14 text-base">
        Prijavi se
      </Gumb>

      <p className="text-center text-sm text-sivosmeda">Zaboravili ste lozinku? Javite se administratoru.</p>
    </form>
  );
}
