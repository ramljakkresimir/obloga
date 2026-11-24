"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { spremiPredracun } from "@/app/(app)/predracuni/actions";
import type { StavkaRezultat } from "@/lib/kalkulacija";
import {
  iznosiRazrade,
  izracunajPredracun,
  kljucStavke,
  predlozeniM2,
  procitajUredivac,
  type GreskeUredivaca,
  type PdvPostavke,
  type SnimakStavke,
  type StanjeUredivaca,
  type StavkaUredivaca,
} from "@/lib/predracuni";
import { PoljeTeksta } from "@/components/biljeske/PoljeTeksta";
import { useZadrziIzlazak, useZastitaIzlaska } from "@/components/navigacija/ZastitaIzlaska";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { Polje } from "@/components/ui/Polje";
import { Poruka } from "@/components/ui/Poruka";
import { Dodaci } from "./Dodaci";
import { OdabirObloge, type OblogaOdabira } from "./OdabirObloge";
import { Popust } from "./Popust";
import { StavkaPredracuna } from "./StavkaPredracuna";
import { SazetakIznosa, TrakaZbroja } from "./TrakaZbroja";

type Props = {
  /** null = novi predračun. */
  predracunId: number | null;
  /** Broj predračuna koji se uređuje (za naslov). */
  broj?: string | null;
  /** Kopiraj: id izvornog predračuna. */
  kopijaOd?: number | null;
  pocetno: StanjeUredivaca;
  /**
   * Uredi: snimci stavki spremljenog predračuna. Obloga koja se ukloni pa ponovno doda
   * zadržava spremljenu cijenu (tako je sprema i server).
   */
  snimciSpremljenih?: Record<number, SnimakStavke>;
  /** Aktivne obloge za odabir. */
  obloge: OblogaOdabira[];
  kategorije: { id: number; naziv: string }[];
  /** PDV postavke za izračun (novi: trenutne Postavke; uredi: snimak predračuna). */
  pdv: PdvPostavke;
  zadanaCijenaLjepila: number;
  /** Npr. obavijest o preskočenim arhiviranim oblogama kod kopiranja. */
  poruka?: string;
};

/**
 * Uređivač predračuna (PRD §5.5, Design §8): jedna stranica sa sekcijama Kupac, Obloge, Dodaci,
 * Popust i Napomena. Iznosi se računaju uživo (lib/kalkulacija.ts); server ih pri spremanju računa ponovno.
 */
export function UredivacPredracuna({
  predracunId,
  broj,
  kopijaOd = null,
  pocetno,
  snimciSpremljenih = {},
  obloge,
  kategorije,
  pdv,
  zadanaCijenaLjepila,
  poruka,
}: Props) {
  const [stanje, setStanje] = useState(pocetno);
  const [odabirOtvoren, setOdabirOtvoren] = useState(false);
  const [fokus, setFokus] = useState<{ artiklId: number } | null>(null);
  const [pokusano, setPokusano] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [sprema, startSpremanja] = useTransition();
  const zadrzi = useZadrziIzlazak();

  const promijenjeno = useMemo(() => JSON.stringify(stanje) !== JSON.stringify(pocetno), [stanje, pocetno]);
  // Kopija još nije spremljena, pa se štiti i bez promjena.
  useZastitaIzlaska((promijenjeno || (kopijaOd !== null && stanje.stavke.length > 0)) && !sprema);

  const izracun = useMemo(() => {
    const predlozeni = predlozeniM2(stanje);
    const { podaci, greske } = procitajUredivac(stanje, predlozeni);
    const snimak = new Map(stanje.stavke.map((s) => [s.artiklId, s]));
    try {
      const { ulaz, rezultat } = izracunajPredracun(podaci, snimak, pdv);
      const poStavci = new Map<number, StavkaRezultat>(podaci.stavke.map((s, i) => [s.artiklId, rezultat.stavke[i]]));
      return {
        podaci,
        greske,
        predlozeni,
        poStavci,
        rezultat,
        iznosi: podaci.stavke.length > 0 ? iznosiRazrade(ulaz, rezultat) : null,
      };
    } catch (e) {
      // Ne bi se smjelo dogoditi: procitajUredivac propušta samo ispravne brojeve.
      return {
        podaci,
        greske: { ...greske, izracun: e instanceof Error ? e.message : "Iznos se ne može izračunati." } as GreskeUredivaca,
        predlozeni,
        poStavci: new Map<number, StavkaRezultat>(),
        rezultat: null,
        iznosi: null,
      };
    }
  }, [stanje, pdv]);

  // Nakon dodavanja (ili odabira već dodane) obloge: fokus na njenu količinu.
  useEffect(() => {
    if (!fokus) return;
    const t = setTimeout(() => {
      const polje = document.querySelector<HTMLInputElement>(`[data-kolicina="${fokus.artiklId}"]`);
      polje?.scrollIntoView({ block: "center", behavior: "smooth" });
      polje?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(t);
  }, [fokus]);

  const dodane = useMemo(() => new Set(stanje.stavke.map((s) => s.artiklId)), [stanje.stavke]);

  function promijeni(promjena: Partial<StanjeUredivaca>) {
    setGreska(null);
    setStanje((s) => ({ ...s, ...promjena }));
  }

  function promijeniStavku(stavka: StavkaUredivaca) {
    setGreska(null);
    setStanje((s) => ({ ...s, stavke: s.stavke.map((x) => (x.artiklId === stavka.artiklId ? stavka : x)) }));
  }

  function ukloniStavku(artiklId: number) {
    setGreska(null);
    setStanje((s) => ({ ...s, stavke: s.stavke.filter((x) => x.artiklId !== artiklId) }));
  }

  function odaberi(o: OblogaOdabira) {
    setOdabirOtvoren(false);
    if (!dodane.has(o.id)) {
      const spremljeni = snimciSpremljenih[o.id];
      const m2PoKomadu = spremljeni ? spremljeni.m2PoKomadu : o.m2_po_komadu;
      const nova: StavkaUredivaca = {
        artiklId: o.id,
        naziv: spremljeni?.naziv ?? o.naziv,
        slika: o.slika,
        cijenaKom: spremljeni?.cijenaKom ?? o.cijena_kom,
        m2PoKomadu,
        unos: m2PoKomadu != null ? "m2" : "kom",
        kolicina: "",
      };
      setGreska(null);
      setStanje((s) => ({ ...s, stavke: [...s.stavke, nova] }));
    }
    setFokus({ artiklId: o.id });
  }

  /** Greška polja: nakon pokušaja spremanja, ili odmah ako je upisano nešto neispravno. */
  function greskaPolja(kljuc: string, tekstPolja: string): string | undefined {
    const g = izracun.greske[kljuc];
    return g && (pokusano || tekstPolja.trim() !== "") ? g : undefined;
  }

  function spremi() {
    setPokusano(true);
    const greske = Object.values(izracun.greske);
    if (greske.length > 0) {
      setGreska(
        izracun.greske.izracun ??
          (stanje.stavke.length === 0 ? "Dodajte barem jednu oblogu." : "Ispravite označena polja pa spremite ponovno."),
      );
      return;
    }
    setGreska(null);
    startSpremanja(async () => {
      // Uspjeh završava redirectom na detalje predračuna s obaviješću.
      const rezultat = await spremiPredracun(predracunId, izracun.podaci, kopijaOd);
      if (rezultat?.greska) setGreska(rezultat.greska);
    });
  }

  const naslov = predracunId ? `Uredi ${broj ?? "predračun"}` : "Novi predračun";
  const natrag = predracunId ? `/predracuni/${predracunId}` : "/predracuni";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="hidden flex-col gap-2 lg:flex">
          <Link
            href={natrag}
            onNavigate={(e) => {
              if (zadrzi(natrag)) e.preventDefault();
            }}
            className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso"
          >
            <ArrowLeft aria-hidden className="size-5" />
            {predracunId ? (broj ?? "Predračun") : "Predračuni"}
          </Link>
          <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">{naslov}</h2>
        </div>
        {predracunId && broj && <p className="-mb-1 text-sivosmeda lg:hidden">Broj {broj} ostaje isti.</p>}

        {poruka && <Poruka vrsta="info">{poruka}</Poruka>}

        <Kartica naslov="Kupac">
          <div className="flex flex-col gap-3">
            <Polje
              oznaka="Ime i prezime"
              autoComplete="off"
              maxLength={120}
              value={stanje.kupacIme}
              onChange={(e) => promijeni({ kupacIme: e.target.value })}
              greska={greskaPolja("kupac_ime", stanje.kupacIme)}
              disabled={sprema}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Polje
                oznaka="Telefon"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={40}
                value={stanje.kupacTelefon}
                onChange={(e) => promijeni({ kupacTelefon: e.target.value })}
                greska={greskaPolja("kupac_telefon", stanje.kupacTelefon)}
                disabled={sprema}
              />
              <Polje
                oznaka="Mjesto"
                autoComplete="off"
                maxLength={80}
                value={stanje.kupacMjesto}
                onChange={(e) => promijeni({ kupacMjesto: e.target.value })}
                greska={greskaPolja("kupac_mjesto", stanje.kupacMjesto)}
                disabled={sprema}
              />
            </div>
          </div>
        </Kartica>

        <Kartica naslov="Obloge">
          {stanje.stavke.length > 0 && (
            <ul className="mb-4 divide-y divide-rub">
              {stanje.stavke.map((s) => (
                <StavkaPredracuna
                  key={s.artiklId}
                  stavka={s}
                  rezultat={izracun.poStavci.get(s.artiklId) ?? null}
                  greska={greskaPolja(kljucStavke(s.artiklId), s.kolicina)}
                  onPromjena={promijeniStavku}
                  onUkloni={() => ukloniStavku(s.artiklId)}
                  disabled={sprema}
                />
              ))}
            </ul>
          )}
          {pokusano && izracun.greske.stavke && (
            <p className="mb-3 text-sm text-greska" role="alert">
              {izracun.greske.stavke}
            </p>
          )}
          <Gumb
            varijanta={stanje.stavke.length === 0 ? "primarni" : "sekundarni"}
            punaSirina
            onClick={() => setOdabirOtvoren(true)}
            disabled={sprema}
          >
            <Plus aria-hidden className="size-5" />
            Dodaj oblogu
          </Gumb>
        </Kartica>

        <Kartica naslov="Dodaci">
          <Dodaci
            dodaci={stanje}
            onPromjena={promijeni}
            predlozeniM2={izracun.predlozeni}
            zadanaCijenaLjepila={zadanaCijenaLjepila}
            iznosi={{
              ugradnja: izracun.iznosi?.ugradnja ?? null,
              ljepilo: izracun.iznosi?.ljepilo ?? null,
              prijevoz: izracun.iznosi?.prijevoz ?? null,
            }}
            greska={greskaPolja}
            disabled={sprema}
          />
        </Kartica>

        <Kartica naslov="Popust">
          <Popust
            popust={stanje.popust}
            onPromjena={(popust) => promijeni({ popust })}
            iznos={izracun.iznosi?.popust ?? 0}
            ogranicen={izracun.rezultat?.popustOgranicen ?? false}
            greska={greskaPolja("popust", stanje.popust.vrijednost)}
            disabled={sprema}
          />
        </Kartica>

        <Kartica naslov="Napomena">
          <PoljeTeksta
            oznaka="Interna napomena (ne ide na PDF)"
            maxLength={1000}
            placeholder="npr. Javiti se u petak"
            value={stanje.napomena}
            onChange={(e) => promijeni({ napomena: e.target.value })}
            greska={greskaPolja("napomena", stanje.napomena)}
            disabled={sprema}
          />
        </Kartica>

        {greska && <Poruka vrsta="greska">{greska}</Poruka>}

        <TrakaZbroja iznosi={izracun.iznosi} onSpremi={spremi} sprema={sprema} />
      </div>

      <SazetakIznosa iznosi={izracun.iznosi} onSpremi={spremi} sprema={sprema} />

      <OdabirObloge
        otvoren={odabirOtvoren}
        onZatvori={() => setOdabirOtvoren(false)}
        obloge={obloge}
        kategorije={kategorije}
        dodane={dodane}
        onOdaberi={odaberi}
      />
    </div>
  );
}
