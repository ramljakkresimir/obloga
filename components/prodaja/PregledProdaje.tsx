"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { ucitajJosProdaja } from "@/app/(app)/prodaja/ucitajJos";
import type { RedakProdaje, StranicaProdaja, ZbrojProdaje } from "@/lib/data/prodaja";
import { brojSImenicom, formatDatum, formatKM, OBLIK_PRODAJA } from "@/lib/format";
import { zapamtiPovratak } from "@/lib/povratak";
import {
  naslovRazdoblja,
  OPCIJE_RAZDOBLJA,
  parametriRazdoblja,
  type Razdoblje,
  type VrstaRazdoblja,
} from "@/lib/razdoblje";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";
import { OznakaStatusa } from "@/components/ui/OznakaStatusa";
import { Polje } from "@/components/ui/Polje";
import { PraznoStanje } from "@/components/ui/PraznoStanje";
import { Segment } from "@/components/ui/Segment";

type Props = {
  razdoblje: Razdoblje;
  zbroj: ZbrojProdaje;
  pocetno: StranicaProdaja;
};

const PUTANJA = "/prodaja";

/**
 * Pregled prodaje (PRD §5.7, Design §11): razdoblje u URL-u (?r=prosli, ?r=raspon&od=&do=),
 * zbroj potvrđenih na vrhu, lista s „Učitaj još". Stornirane su prigušene i nisu u zbroju.
 */
export function PregledProdaje({ razdoblje, zbroj, pocetno }: Props) {
  const router = useRouter();
  const obavijest = useObavijest();
  const [starije, setStarije] = useState<RedakProdaje[]>([]);
  const [josIma, setJosIma] = useState(pocetno.josIma);
  const [pomak, setPomak] = useState(pocetno.prodaje.length);
  // Nova prva stranica sa servera (drugo razdoblje ili osvježavanje): „Učitaj još" kreće ispočetka.
  const [prvaStranica, setPrvaStranica] = useState(pocetno);
  if (pocetno !== prvaStranica) {
    setPrvaStranica(pocetno);
    setStarije([]);
    setJosIma(pocetno.josIma);
    setPomak(pocetno.prodaje.length);
  }
  const [mijenja, startPromjene] = useTransition();
  const [ucitava, startUcitavanja] = useTransition();

  const [listOtvoren, setListOtvoren] = useState(false);
  const [odUnos, setOdUnos] = useState(razdoblje.od);
  const [doUnos, setDoUnos] = useState(razdoblje.do);
  const [greskaRaspona, setGreskaRaspona] = useState<string>();

  function idiNa(novo: Razdoblje) {
    const params = parametriRazdoblja(novo);
    const url = params.size ? `${PUTANJA}?${params}` : PUTANJA;
    zapamtiPovratak(PUTANJA, url);
    startPromjene(() => router.replace(url, { scroll: false }));
  }

  function odaberi(vrsta: VrstaRazdoblja) {
    if (vrsta === "raspon") {
      setOdUnos(razdoblje.od);
      setDoUnos(razdoblje.do);
      setGreskaRaspona(undefined);
      setListOtvoren(true);
      return;
    }
    // Datumi se računaju na serveru (zona Sarajeva); ovdje je bitna samo vrsta.
    idiNa({ vrsta, od: "", do: "" });
  }

  function primijeniRaspon(e: FormEvent) {
    e.preventDefault();
    if (!odUnos || !doUnos) {
      setGreskaRaspona("Odaberite oba datuma.");
      return;
    }
    if (odUnos > doUnos) {
      setGreskaRaspona("Datum „od” ne može biti nakon datuma „do”.");
      return;
    }
    setListOtvoren(false);
    idiNa({ vrsta: "raspon", od: odUnos, do: doUnos });
  }

  // Pomak po offsetu: ako je u međuvremenu stigla nova prodaja, isti redak može doći dvaput.
  const vidjeni = new Set(pocetno.prodaje.map((p) => p.id));
  const prodaje = [...pocetno.prodaje, ...starije.filter((p) => !vidjeni.has(p.id) && vidjeni.add(p.id))];

  function ucitajJos() {
    startUcitavanja(async () => {
      const rezultat = await ucitajJosProdaja(razdoblje.od, razdoblje.do, pomak);
      if ("greska" in rezultat) {
        obavijest(rezultat.greska, "greska");
        return;
      }
      setStarije((s) => [...s, ...rezultat.prodaje]);
      setPomak((p) => p + rezultat.prodaje.length);
      setJosIma(rezultat.josIma);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Segment
        oznaka="Razdoblje"
        opcije={OPCIJE_RAZDOBLJA}
        vrijednost={razdoblje.vrsta}
        onPromjena={odaberi}
        className="w-full lg:w-auto lg:self-start"
      />

      <div aria-busy={mijenja} className={`flex flex-col gap-4 transition-opacity ${mijenja ? "opacity-60" : ""}`}>
        <section
          aria-label="Zbroj prodaje"
          className="rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)]"
        >
          {razdoblje.vrsta === "raspon" ? (
            <button
              type="button"
              onClick={() => odaberi("raspon")}
              className="text-[13px] leading-[18px] font-semibold text-sivosmeda underline-offset-4 hover:text-espresso hover:underline"
            >
              {naslovRazdoblja(razdoblje)}
            </button>
          ) : (
            <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda">{naslovRazdoblja(razdoblje)}</p>
          )}
          <p className="mt-1 font-naslov text-3xl leading-10 font-semibold text-espresso tabular-nums">
            {formatKM(zbroj.ukupno)}
          </p>
          <p className="text-sivosmeda tabular-nums">{brojSImenicom(zbroj.broj, OBLIK_PRODAJA)}</p>
        </section>

        {prodaje.length === 0 ? (
          <PraznoStanje
            ikona={Receipt}
            naslov="Nema prodaja"
            opis="U ovom razdoblju nema potvrđenih predračuna ni brzih prodaja."
          />
        ) : (
          <ul className="divide-y divide-rub overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina shadow-[var(--shadow-kartica)]">
            {prodaje.map((p) => (
              <Redak key={p.id} prodaja={p} />
            ))}
          </ul>
        )}
      </div>

      {josIma && (
        <Gumb varijanta="sekundarni" punaSirina ucitavanje={ucitava} onClick={ucitajJos}>
          Učitaj još
        </Gumb>
      )}

      <DonjiList otvoren={listOtvoren} onZatvori={() => setListOtvoren(false)} naslov="Odaberite razdoblje">
        <form onSubmit={primijeniRaspon} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Polje
              oznaka="Od"
              type="date"
              value={odUnos}
              max={doUnos || undefined}
              onChange={(e) => {
                setOdUnos(e.target.value);
                setGreskaRaspona(undefined);
              }}
            />
            <Polje
              oznaka="Do"
              type="date"
              value={doUnos}
              min={odUnos || undefined}
              onChange={(e) => {
                setDoUnos(e.target.value);
                setGreskaRaspona(undefined);
              }}
            />
          </div>
          {greskaRaspona && (
            <p role="alert" className="text-sm text-greska">
              {greskaRaspona}
            </p>
          )}
          <Gumb type="submit" punaSirina>
            Primijeni
          </Gumb>
        </form>
      </DonjiList>
    </div>
  );
}

function Redak({ prodaja: p }: { prodaja: RedakProdaje }) {
  const storniran = p.status === "storniran";
  const naziv = p.vrsta === "predracun" ? p.broj : "Brza prodaja";
  const href = p.vrsta === "predracun" ? `/predracuni/${p.id}` : `/prodaja/${p.id}`;
  return (
    <li>
      <Link
        href={href}
        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-pozadina ${storniran ? "opacity-70" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-tekst">
            {naziv}
            {p.kupac_ime && <span className="font-normal text-sivosmeda"> · {p.kupac_ime}</span>}
          </p>
          <p className="text-sm text-sivosmeda tabular-nums">{formatDatum(p.potvrden_at)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`font-naslov font-semibold tabular-nums ${storniran ? "text-sivosmeda line-through" : "text-espresso"}`}
          >
            {formatKM(p.ukupno)}
          </span>
          {storniran && <OznakaStatusa status="storniran" />}
        </div>
      </Link>
    </li>
  );
}
