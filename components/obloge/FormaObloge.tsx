"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { postaviSliku, spremiOblogu, type StanjeObloge } from "@/app/(app)/obloge/actions";
import type { OblogaDetalji } from "@/lib/data/obloge";
import { formatBroj, formatKM, parseBroj } from "@/lib/format";
import { cijenaPoM2, m2IzDimenzija } from "@/lib/obloge";
import { BUCKET_SLIKA, putanjaSlike, smanjiSliku } from "@/lib/slike";
import { createClient } from "@/utils/supabase/client";
import { BrojPolje } from "@/components/ui/BrojPolje";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { useObavijest } from "@/components/ui/Obavijest";
import { Odabir } from "@/components/ui/Odabir";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";
import { ArhivirajOblogu, ObrisiOblogu, VratiIzArhive } from "./ArhivaObloge";
import { UploadSlike } from "./UploadSlike";

type Props = {
  kategorije: { id: number; naziv: string }[];
  /** Bez obloge: nova obloga. */
  obloga?: OblogaDetalji;
  /** Samo kod uređivanja: obloga nikad nije prodana, pa se smije trajno obrisati. */
  mozeSeObrisati?: boolean;
};

/** Broj → tekst za polje ("0,448"), bez grupiranja tisućica. */
function uPolje(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

/** Smanji sliku, uploadaj je iz preglednika u Storage i upiši putanju. Vraća poruku greške ili null. */
async function spremiSliku(oblogaId: number, datoteka: File): Promise<string | null> {
  try {
    const smanjena = await smanjiSliku(datoteka);
    const putanja = putanjaSlike(oblogaId, smanjena.ekstenzija);
    const { error } = await createClient()
      .storage.from(BUCKET_SLIKA)
      .upload(putanja, smanjena.blob, { contentType: smanjena.tip, cacheControl: "31536000", upsert: false });
    if (error) return "Upload slike nije uspio. Provjerite internetsku vezu i pokušajte ponovno.";
    const rezultat = await postaviSliku(oblogaId, putanja);
    return rezultat?.greska ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : "Slika nije spremljena.";
  }
}

/**
 * Nova obloga / uredi oblogu. Šalje se kroz onSubmit (ne action={…}), pa polja ostaju nakon greške.
 * Redoslijed: spremi podatke (Server Action vraća id) → upload slike iz preglednika → postaviSliku.
 */
export function FormaObloge({ kategorije, obloga, mozeSeObrisati }: Props) {
  const router = useRouter();
  const obavijest = useObavijest();

  const [slika, setSlika] = useState<{ datoteka: File; pregled: string } | null>(null);
  const [greskaSlike, setGreskaSlike] = useState<string>();

  const [sirina, setSirina] = useState(uPolje(obloga?.sirina_cm));
  const [duzina, setDuzina] = useState(uPolje(obloga?.duzina_cm));
  const [m2, setM2] = useState(uPolje(obloga?.m2_po_komadu));
  // m² se računa iz dimenzija dok ga vlasnik ručno ne promijeni (npr. za role ili pakete).
  const [m2Rucno, setM2Rucno] = useState(
    () => !!obloga && obloga.m2_po_komadu !== m2IzDimenzija(obloga.sirina_cm, obloga.duzina_cm),
  );
  const [cijena, setCijena] = useState(uPolje(obloga?.cijena_kom));

  const [stanje, posalji, radi] = useActionState<StanjeObloge, FormData>(async (prethodno, formData) => {
    const rezultat = await spremiOblogu(prethodno, formData);
    if (!rezultat?.id) return rezultat;

    const oblogaId = rezultat.id;
    let poruka = rezultat.greska ?? rezultat.uspjeh ?? "Spremljeno.";
    let vrsta: "uspjeh" | "greska" = rezultat.greska ? "greska" : "uspjeh";
    let cilj = `/obloge/${oblogaId}`;

    if (slika) {
      const greska = await spremiSliku(oblogaId, slika.datoteka);
      if (greska) {
        poruka = `${obloga ? "Podaci su spremljeni" : "Obloga je dodana"}, ali slika nije. ${greska}`;
        vrsta = "greska";
        cilj = `/obloge/${oblogaId}/uredi`; // ostani na uređivanju da se slika pokuša ponovno
      }
    }

    obavijest(poruka, vrsta);
    // replace: forma ne ostaje u povijesti, pa „Natrag" s detalja vodi na listu.
    if (!(obloga && cilj.endsWith("/uredi"))) router.replace(cilj);
    else router.refresh();
    return rezultat;
  }, undefined);
  const g = stanje?.greske;

  function spremi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => posalji(formData));
  }

  function odaberiSliku(datoteka: File) {
    if (!datoteka.type.startsWith("image/")) {
      setGreskaSlike("Odabrana datoteka nije slika.");
      return;
    }
    setGreskaSlike(undefined);
    if (slika) URL.revokeObjectURL(slika.pregled);
    setSlika({ datoteka, pregled: URL.createObjectURL(datoteka) });
  }

  function promijeniDimenziju(sirinaTekst: string, duzinaTekst: string) {
    setSirina(sirinaTekst);
    setDuzina(duzinaTekst);
    if (m2Rucno) return;
    setM2(uPolje(m2IzDimenzija(parseBroj(sirinaTekst), parseBroj(duzinaTekst))));
  }

  const izDimenzija = m2IzDimenzija(parseBroj(sirina), parseBroj(duzina));
  const m2Broj = parseBroj(m2);
  const pomocM2 =
    m2.trim() === ""
      ? "Prazno = prodaje se samo na komade (npr. pribor)."
      : m2Rucno && izDimenzija !== null && izDimenzija !== m2Broj
        ? `Ručno upisano (iz dimenzija bi bilo ${formatBroj(izDimenzija, 4)}).`
        : izDimenzija !== null
          ? "Izračunato iz dimenzija. Može se promijeniti, npr. za pakete."
          : undefined;

  const cijenaBroj = parseBroj(cijena);
  const poM2 = cijenaBroj !== null && cijenaBroj >= 0 ? cijenaPoM2(cijenaBroj, m2Broj) : null;

  return (
    <form onSubmit={spremi} noValidate className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {obloga && <input type="hidden" name="id" value={obloga.id} />}

      {obloga && !obloga.aktivan && (
        <div className="flex flex-col gap-3">
          <Poruka vrsta="info">Obloga je arhivirana i ne prikazuje se na listi ni u odabiru.</Poruka>
          <VratiIzArhive oblogaId={obloga.id} className="self-start" />
        </div>
      )}

      <UploadSlike
        postojeca={obloga?.slika ?? null}
        pregled={slika?.pregled ?? null}
        onOdabir={odaberiSliku}
        greska={greskaSlike}
        disabled={radi}
      />

      <Kartica naslov="Osnovno">
        <div className="flex flex-col gap-4">
          <Polje
            oznaka="Naziv"
            name="naziv"
            defaultValue={obloga?.naziv ?? ""}
            placeholder="npr. WPC panel 16×280 – Svijetli hrast"
            autoComplete="off"
            maxLength={120}
            required
            greska={g?.naziv}
          />
          <Odabir
            oznaka="Kategorija"
            name="kategorija_id"
            defaultValue={obloga?.kategorija_id ?? ""}
            required
            greska={g?.kategorija_id}
            pomoc={kategorije.length === 0 ? "Najprije dodajte kategoriju u Postavkama." : undefined}
          >
            <option value="" disabled>
              Odaberite kategoriju
            </option>
            {kategorije.map((k) => (
              <option key={k.id} value={k.id}>
                {k.naziv}
              </option>
            ))}
          </Odabir>
        </div>
      </Kartica>

      <Kartica naslov="Dimenzije">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <BrojPolje
              oznaka="Širina"
              name="sirina_cm"
              jedinica="cm"
              decimalno
              vrijednost={sirina}
              onPromjena={(t) => promijeniDimenziju(t, duzina)}
              greska={g?.sirina_cm}
            />
            <BrojPolje
              oznaka="Dužina"
              name="duzina_cm"
              jedinica="cm"
              decimalno
              vrijednost={duzina}
              onPromjena={(t) => promijeniDimenziju(sirina, t)}
              greska={g?.duzina_cm}
            />
          </div>
          <BrojPolje
            oznaka="m² po komadu"
            name="m2_po_komadu"
            jedinica="m²"
            decimalno
            vrijednost={m2}
            onPromjena={(t) => {
              setM2(t);
              setM2Rucno(t.trim() !== "");
            }}
            greska={g?.m2_po_komadu}
            pomoc={pomocM2}
          />
        </div>
      </Kartica>

      <Kartica naslov="Cijena i stanje">
        <div className="flex flex-col gap-4">
          <BrojPolje
            oznaka="Cijena po komadu"
            name="cijena_kom"
            jedinica="KM"
            decimalno
            vrijednost={cijena}
            onPromjena={setCijena}
            greska={g?.cijena_kom}
            pomoc={poM2 !== null ? `= ${formatKM(poM2)}/m²` : undefined}
          />
          <BrojPolje
            oznaka="Minimalno stanje"
            name="min_stanje"
            jedinica="kom"
            koraci
            najmanje={0}
            defaultValue={obloga?.min_stanje ?? 0}
            greska={g?.min_stanje}
            pomoc="Na ovom broju ili ispod obloga dobije oznaku „Nisko”."
          />
          {!obloga && (
            <BrojPolje
              oznaka="Početno stanje (neobavezno)"
              name="pocetno_stanje"
              jedinica="kom"
              koraci
              najmanje={0}
              greska={g?.pocetno_stanje}
              pomoc="Koliko komada već imate. Upisuje se u povijest kao ulaz robe."
            />
          )}
        </div>
      </Kartica>

      {obloga && (
        <div className="flex flex-col gap-1">
          {obloga.aktivan && <ArhivirajOblogu oblogaId={obloga.id} naziv={obloga.naziv} />}
          {mozeSeObrisati ? (
            <ObrisiOblogu oblogaId={obloga.id} naziv={obloga.naziv} />
          ) : (
            <p className="text-sm text-sivosmeda">
              Ne može se trajno obrisati jer je korištena u predračunu ili prodaji. Možete je arhivirati.
            </p>
          )}
        </div>
      )}

      {stanje?.greska && !stanje.id && <Poruka vrsta="greska">{stanje.greska}</Poruka>}
      {g && <Poruka vrsta="greska">Provjerite označena polja.</Poruka>}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-rub bg-pozadina/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <Gumb type="submit" punaSirina ucitavanje={radi} className="min-h-14 text-lg">
          {obloga ? "Spremi" : "Dodaj oblogu"}
        </Gumb>
      </div>
    </form>
  );
}
