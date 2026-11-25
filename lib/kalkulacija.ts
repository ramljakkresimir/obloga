// Izračun predračuna i brze prodaje (PRD §6.1–6.4). Čista funkcija bez ovisnosti:
// koriste je uređivač (uživo), Server Action (ponovni izračun) i PDF.
//
// Svi iznosi su u feninzima (cijeli brojevi). Sve dijeljenje je cjelobrojno sa
// zaokruživanjem pola naviše, pa nema grešaka tipa 0.1 + 0.2.

export type JedinicaUnosa = "m2" | "kom";

export type StavkaUlaz = {
  cijenaKomFen: number;
  /** m² po komadu (do 4 decimale); null ako obloga nema dimenzije. */
  m2PoKomadu: number | null;
  unos: JedinicaUnosa;
  /** m² (do 2 decimale) ili broj komada (cijeli broj), ovisno o `unos`. */
  kolicina: number;
  /** Popust stavke: posto 0–100 ili KM na cijelu stavku (ne veći od iznosa stavke). */
  popust?: Popust;
};

export type Popust = { tip: "posto" | "km"; vrijednost: number };

export type PdvPostavke = {
  uSustavu: boolean;
  cijeneSaPdv: boolean;
  /** Postotak, npr. 17 (do 2 decimale). */
  stopa: number;
};

export type UlazKalkulacije = {
  /** Smije biti prazno (npr. samo ugradnja ili prijevoz). */
  stavke: StavkaUlaz[];
  /** undefined = isključeno. m² do 2 decimale. */
  ugradnja?: { m2: number; cijenaM2Fen: number };
  ljepilo?: { kom: number; cijenaFen: number };
  prijevozFen?: number;
  /** posto: 0–100 (do 2 decimale); km: iznos u KM (do 2 decimale), kao `popust_vrijednost` u bazi. */
  popust?: Popust;
  pdv: PdvPostavke;
};

export type StavkaRezultat = {
  komada: number;
  /** Upisani m², ili komada × m² po komadu za unos u komadima; null bez m² po komadu. */
  m2: number | null;
  /** Komada × cijena, prije popusta stavke. */
  brutoFen: number;
  popustFen: number;
  /** true ako je traženi popust stavke bio veći od njenog iznosa pa je smanjen. */
  popustOgranicen: boolean;
  /** Iznos stavke nakon njenog popusta (ulazi u zbroj). */
  iznosFen: number;
};

export type RezultatKalkulacije = {
  stavke: StavkaRezultat[];
  /** Zbroj stavki nakon popusta stavki. */
  stavkeFen: number;
  /** Zbroj popusta stavki (već oduzet u `stavkeFen`). */
  popustStavkiFen: number;
  ugradnjaFen: number;
  ljepiloFen: number;
  prijevozFen: number;
  dodaciFen: number;
  medjuzbrojFen: number;
  popustFen: number;
  /** true ako je traženi popust bio veći od međuzbroja pa je smanjen na međuzbroj. */
  popustOgranicen: boolean;
  nakonPopustaFen: number;
  osnovicaFen: number;
  pdvFen: number;
  ukupnoFen: number;
  /** Prijedlog m² za ugradnju, na 2 decimale. */
  predlozeniM2Ugradnje: number;
};

/** Iznos u KM → feninzi (22 → 2200, 832.67 → 83267). */
export function kmUFen(km: number): number {
  konacan(km, "Iznos");
  return Math.round(km * 100);
}

/** Feninzi → iznos u KM (83267 → 832.67), za bazu i `formatKM`. */
export function fenUKm(fen: number): number {
  return fen / 100;
}

/** m² se računa u desettisućinkama (numeric(10,4) u bazi). */
const M2_SKALA = 10_000;

export function izracunaj(ulaz: UlazKalkulacije): RezultatKalkulacije {
  // 1. Stavke
  let predlozeniM2Skal = 0;
  const stavke = ulaz.stavke.map((s, i): StavkaRezultat => {
    const oznaka = `Stavka ${i + 1}`;
    cijeliNenegativan(s.cijenaKomFen, `${oznaka}: cijena`);
    const m2PoKomaduSkal = s.m2PoKomadu == null ? null : m2USkalu(s.m2PoKomadu, `${oznaka}: m² po komadu`);

    let komada: number;
    let m2: number | null;
    if (s.unos === "m2") {
      if (m2PoKomaduSkal == null) throw new Error(`${oznaka}: obloga nema m² po komadu, količina se mora upisati u komadima.`);
      const m2Skal = m2USkalu(s.kolicina, `${oznaka}: količina`);
      komada = Math.floor((m2Skal + m2PoKomaduSkal - 1) / m2PoKomaduSkal); // naviše, bez rezerve
      m2 = s.kolicina;
      predlozeniM2Skal += m2Skal;
    } else if (s.unos === "kom") {
      cijeliPozitivan(s.kolicina, `${oznaka}: količina`);
      komada = s.kolicina;
      m2 = m2PoKomaduSkal == null ? null : (komada * m2PoKomaduSkal) / M2_SKALA;
      if (m2PoKomaduSkal != null) predlozeniM2Skal += komada * m2PoKomaduSkal;
    } else {
      throw new Error(`${oznaka}: nepoznata jedinica unosa.`);
    }

    const brutoFen = komada * s.cijenaKomFen;
    const { popustFen, popustOgranicen } = popustNa(brutoFen, s.popust, `${oznaka}: popust`);
    return { komada, m2, brutoFen, popustFen, popustOgranicen, iznosFen: brutoFen - popustFen };
  });
  const stavkeFen = zbroj(stavke.map((s) => s.iznosFen));
  const popustStavkiFen = zbroj(stavke.map((s) => s.popustFen));

  // 2. Dodaci
  let ugradnjaFen = 0;
  if (ulaz.ugradnja) {
    const m2Centi = pozitivanNaDecimale(ulaz.ugradnja.m2, 100, "Ugradnja: m²");
    cijeliNenegativan(ulaz.ugradnja.cijenaM2Fen, "Ugradnja: cijena po m²");
    ugradnjaFen = podijeliZaokruzi(m2Centi * ulaz.ugradnja.cijenaM2Fen, 100);
  }

  let ljepiloFen = 0;
  if (ulaz.ljepilo) {
    cijeliPozitivan(ulaz.ljepilo.kom, "Ljepilo: komada");
    cijeliNenegativan(ulaz.ljepilo.cijenaFen, "Ljepilo: cijena");
    ljepiloFen = ulaz.ljepilo.kom * ulaz.ljepilo.cijenaFen;
  }

  let prijevozFen = 0;
  if (ulaz.prijevozFen !== undefined) {
    cijeliNenegativan(ulaz.prijevozFen, "Prijevoz");
    prijevozFen = ulaz.prijevozFen;
  }

  const dodaciFen = ugradnjaFen + ljepiloFen + prijevozFen;

  // 3. Međuzbroj
  const medjuzbrojFen = stavkeFen + dodaciFen;

  // 4. Ukupni popust (na međuzbroj nakon popusta stavki, ne veći od njega)
  const { popustFen, popustOgranicen } = popustNa(medjuzbrojFen, ulaz.popust, "Popust");

  // 5. Iznos nakon popusta
  const nakonPopustaFen = medjuzbrojFen - popustFen;

  // 6. PDV (PRD §6.3)
  konacan(ulaz.pdv.stopa, "Stopa PDV-a");
  if (ulaz.pdv.stopa < 0) throw new Error("Stopa PDV-a ne može biti negativna.");
  const stopaBp = Math.round(ulaz.pdv.stopa * 100); // 17 % → 1700

  let osnovicaFen: number;
  let pdvFen: number;
  let ukupnoFen: number;
  if (!ulaz.pdv.uSustavu) {
    osnovicaFen = nakonPopustaFen;
    pdvFen = 0;
    ukupnoFen = nakonPopustaFen;
  } else if (ulaz.pdv.cijeneSaPdv) {
    osnovicaFen = podijeliZaokruzi(nakonPopustaFen * 10_000, 10_000 + stopaBp);
    pdvFen = nakonPopustaFen - osnovicaFen;
    ukupnoFen = nakonPopustaFen;
  } else {
    osnovicaFen = nakonPopustaFen;
    pdvFen = podijeliZaokruzi(nakonPopustaFen * stopaBp, 10_000);
    ukupnoFen = osnovicaFen + pdvFen;
  }

  return {
    stavke,
    stavkeFen,
    popustStavkiFen,
    ugradnjaFen,
    ljepiloFen,
    prijevozFen,
    dodaciFen,
    medjuzbrojFen,
    popustFen,
    popustOgranicen,
    nakonPopustaFen,
    osnovicaFen,
    pdvFen,
    ukupnoFen,
    predlozeniM2Ugradnje: podijeliZaokruzi(predlozeniM2Skal, M2_SKALA / 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Pomoćne funkcije

/** Popust (% ili KM) na iznos, ograničen na taj iznos. Isto pravilo za stavku i za ukupni popust. */
function popustNa(iznosFen: number, popust: Popust | undefined, naziv: string): { popustFen: number; popustOgranicen: boolean } {
  if (!popust) return { popustFen: 0, popustOgranicen: false };
  const { tip, vrijednost } = popust;
  konacan(vrijednost, naziv);
  if (vrijednost < 0) throw new Error(`${naziv} ne može biti negativan.`);
  let trazeniFen: number;
  if (tip === "posto") {
    if (vrijednost > 100) throw new Error(`${naziv} u postocima ne može biti veći od 100 %.`);
    trazeniFen = podijeliZaokruzi(iznosFen * Math.round(vrijednost * 100), 10_000);
  } else if (tip === "km") {
    trazeniFen = kmUFen(vrijednost);
  } else {
    throw new Error("Nepoznata vrsta popusta.");
  }
  return { popustFen: Math.min(trazeniFen, iznosFen), popustOgranicen: trazeniFen > iznosFen };
}

/** a / b zaokruženo pola naviše, za cijele a ≥ 0 i b > 0. */
function podijeliZaokruzi(a: number, b: number): number {
  return Math.floor((2 * a + b) / (2 * b));
}

function zbroj(brojevi: number[]): number {
  return brojevi.reduce((a, b) => a + b, 0);
}

function konacan(n: number, naziv: string): void {
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`${naziv}: neispravan broj.`);
}

function cijeliNenegativan(n: number, naziv: string): void {
  konacan(n, naziv);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${naziv}: mora biti cijeli broj feninga ≥ 0.`);
}

function cijeliPozitivan(n: number, naziv: string): void {
  konacan(n, naziv);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${naziv}: mora biti cijeli broj veći od 0.`);
}

/** Pozitivan broj → cijeli broj u zadanoj skali (npr. 12.5 m² × 100 → 1250). Nakon zaokruživanja mora ostati > 0. */
function pozitivanNaDecimale(n: number, skala: number, naziv: string): number {
  konacan(n, naziv);
  const skaliran = Math.round(n * skala);
  if (n <= 0 || skaliran <= 0) throw new Error(`${naziv}: mora biti veće od 0.`);
  return skaliran;
}

function m2USkalu(m2: number, naziv: string): number {
  return pozitivanNaDecimale(m2, M2_SKALA, naziv);
}
