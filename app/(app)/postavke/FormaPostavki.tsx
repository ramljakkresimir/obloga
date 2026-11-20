"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { spremiPostavke, type StanjePostavki } from "./actions";
import type { Postavke } from "@/lib/data/postavke";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { useObavijest } from "@/components/ui/Obavijest";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";
import { Prekidac } from "@/components/ui/Prekidac";

/**
 * Podaci firme, PDV i ljepilo – jedna forma i jedan gumb „Spremi".
 * Šalje se kroz onSubmit (ne action={…}), pa React ne resetira polja kad server vrati grešku.
 */
export function FormaPostavki({ postavke: p }: { postavke: Postavke }) {
  const obavijest = useObavijest();
  const [uSustavuPdv, setUSustavuPdv] = useState(p.u_sustavu_pdv);
  const [stanje, posalji, radi] = useActionState<StanjePostavki, FormData>(async (prethodno, formData) => {
    const rezultat = await spremiPostavke(prethodno, formData);
    if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
    return rezultat;
  }, undefined);
  const g = stanje?.greske;

  function spremi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => posalji(formData));
  }

  return (
    <form onSubmit={spremi} noValidate className="flex flex-col gap-4">
      <Kartica naslov="Podaci firme">
        <p className="-mt-2 mb-4 text-sm text-sivosmeda">Prikazuju se u zaglavlju PDF predračuna.</p>
        <div className="flex flex-col gap-4">
          <Polje
            oznaka="Naziv firme"
            name="naziv_firme"
            defaultValue={p.naziv_firme}
            autoComplete="organization"
            maxLength={120}
            required
            greska={g?.naziv_firme}
          />
          <Polje oznaka="Adresa" name="adresa" defaultValue={p.adresa ?? ""} autoComplete="street-address" maxLength={200} greska={g?.adresa} />
          <Polje oznaka="Mjesto" name="mjesto" defaultValue={p.mjesto ?? ""} autoComplete="address-level2" maxLength={100} greska={g?.mjesto} />
          <Polje oznaka="Telefon" name="telefon" type="tel" defaultValue={p.telefon ?? ""} autoComplete="tel" maxLength={50} greska={g?.telefon} />
          <Polje oznaka="Email" name="email" type="email" defaultValue={p.email ?? ""} autoComplete="email" maxLength={254} greska={g?.email} />
          <Polje
            oznaka="JIB"
            name="jib"
            defaultValue={p.jib ?? ""}
            inputMode="numeric"
            autoComplete="off"
            maxLength={17}
            pomoc="13 znamenki."
            greska={g?.jib}
          />
        </div>
      </Kartica>

      <Kartica naslov="PDV">
        <div className="flex flex-col gap-4">
          <Prekidac
            oznaka="Firma je u sustavu PDV-a"
            name="u_sustavu_pdv"
            checked={uSustavuPdv}
            onChange={(e) => setUSustavuPdv(e.target.checked)}
            pomoc={uSustavuPdv ? undefined : "Predračun prikazuje samo ukupni iznos, bez PDV-a."}
          />
          {/* Ovisna polja ostaju u DOM-u (samo skrivena), da se unos ne izgubi pri ponovnom uključivanju. */}
          <div className={uSustavuPdv ? "flex flex-col gap-4" : "hidden"}>
            <Prekidac
              oznaka="Unesene cijene uključuju PDV"
              name="cijene_sa_pdv"
              defaultChecked={p.cijene_sa_pdv}
              pomoc="Uključeno: osnovica se računa iz iznosa. Isključeno: PDV se dodaje na iznos."
            />
            <BrojPolje
              oznaka="Stopa PDV-a"
              name="pdv_stopa"
              jedinica="%"
              decimalno
              defaultValue={p.pdv_stopa}
              greska={g?.pdv_stopa}
            />
            <Polje oznaka="PDV broj" name="pdv_broj" defaultValue={p.pdv_broj ?? ""} autoComplete="off" maxLength={50} greska={g?.pdv_broj} />
          </div>
        </div>
      </Kartica>

      <Kartica naslov="Ljepilo">
        <BrojPolje
          oznaka="Zadana cijena ljepila (po komadu)"
          name="ljepilo_cijena"
          jedinica="KM"
          decimalno
          defaultValue={p.ljepilo_cijena.toFixed(2).replace(".", ",")}
          pomoc="Sama se upiše kad u predračunu uključite ljepilo; tamo se po potrebi može promijeniti."
          greska={g?.ljepilo_cijena}
        />
      </Kartica>

      {stanje?.greska && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      {g && <Poruka vrsta="greska">Provjerite označena polja.</Poruka>}
      <Gumb type="submit" punaSirina ucitavanje={radi}>
        Spremi
      </Gumb>
    </form>
  );
}
