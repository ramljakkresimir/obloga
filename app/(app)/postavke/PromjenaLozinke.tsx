"use client";

import { useActionState, useEffect, useRef } from "react";
import { promijeniLozinku, type StanjeLozinke } from "./actions";
import { Gumb } from "@/components/ui/Gumb";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";

export function PromjenaLozinke() {
  const [stanje, akcija] = useActionState<StanjeLozinke, FormData>(promijeniLozinku, undefined);
  const forma = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (stanje?.uspjeh) forma.current?.reset();
  }, [stanje]);

  return (
    <form ref={forma} action={akcija} className="flex flex-col gap-4" noValidate>
      {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      {stanje?.uspjeh && <Poruka vrsta="uspjeh">{stanje.uspjeh}</Poruka>}

      <Polje
        oznaka="Trenutna lozinka"
        name="trenutna"
        type="password"
        autoComplete="current-password"
        required
        greska={stanje?.greske?.trenutna}
      />
      <Polje
        oznaka="Nova lozinka"
        name="nova"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        pomoc="Najmanje 8 znakova."
        greska={stanje?.greske?.nova}
      />
      <Polje
        oznaka="Ponovite novu lozinku"
        name="ponovi"
        type="password"
        autoComplete="new-password"
        required
        greska={stanje?.greske?.ponovi}
      />

      <Gumb type="submit" punaSirina>
        Promijeni lozinku
      </Gumb>
    </form>
  );
}
