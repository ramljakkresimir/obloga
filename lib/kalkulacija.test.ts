import { describe, expect, it } from "vitest";
import { fenUKm, izracunaj, kmUFen, type PdvPostavke, type UlazKalkulacije } from "./kalkulacija";

const BEZ_PDV: PdvPostavke = { uSustavu: false, cijeneSaPdv: false, stopa: 17 };
const SA_PDV: PdvPostavke = { uSustavu: true, cijeneSaPdv: true, stopa: 17 };
const NETO: PdvPostavke = { uSustavu: true, cijeneSaPdv: false, stopa: 17 };

/** WPC panel 16×280 – Svijetli hrast: 0,448 m²/kom, 22,00 KM/kom. */
const WPC = { cijenaKomFen: 2200, m2PoKomadu: 0.448 } as const;

/** PRD §6.4: 12,5 m², ugradnja 15 KM/m², 4 ljepila × 12 KM, prijevoz 25 KM, popust 5 %. */
function primjer(pdv: PdvPostavke): UlazKalkulacije {
  return {
    stavke: [{ ...WPC, unos: "m2", kolicina: 12.5 }],
    ugradnja: { m2: 12.5, cijenaM2Fen: 1500 },
    ljepilo: { kom: 4, cijenaFen: 1200 },
    prijevozFen: 2500,
    popust: { tip: "posto", vrijednost: 5 },
    pdv,
  };
}

describe("izracunaj – primjer iz PRD §6.4", () => {
  it("stavke, dodaci, međuzbroj i popust", () => {
    const r = izracunaj(primjer(BEZ_PDV));
    expect(r.stavke).toEqual([{ komada: 28, m2: 12.5, iznosFen: 61600 }]);
    expect(r.stavkeFen).toBe(61600);
    expect(r.ugradnjaFen).toBe(18750);
    expect(r.ljepiloFen).toBe(4800);
    expect(r.prijevozFen).toBe(2500);
    expect(r.dodaciFen).toBe(26050);
    expect(r.medjuzbrojFen).toBe(87650);
    expect(r.popustFen).toBe(4383); // 43,825 → 43,83
    expect(r.popustOgranicen).toBe(false);
    expect(r.nakonPopustaFen).toBe(83267);
    expect(r.predlozeniM2Ugradnje).toBe(12.5);
  });

  it("firma nije u sustavu PDV-a: ukupno 832,67", () => {
    const r = izracunaj(primjer(BEZ_PDV));
    expect(r.osnovicaFen).toBe(83267);
    expect(r.pdvFen).toBe(0);
    expect(r.ukupnoFen).toBe(83267);
  });

  it("cijene uključuju PDV: 711,68 + 120,99 = 832,67", () => {
    const r = izracunaj(primjer(SA_PDV));
    expect(r.osnovicaFen).toBe(71168);
    expect(r.pdvFen).toBe(12099);
    expect(r.ukupnoFen).toBe(83267);
  });

  it("cijene bez PDV-a: 832,67 + 141,55 = 974,22", () => {
    const r = izracunaj(primjer(NETO));
    expect(r.osnovicaFen).toBe(83267);
    expect(r.pdvFen).toBe(14155);
    expect(r.ukupnoFen).toBe(97422);
  });
});

describe("izracunaj – komadi", () => {
  const jednaStavka = (stavka: UlazKalkulacije["stavke"][number]) => izracunaj({ stavke: [stavka], pdv: BEZ_PDV }).stavke[0];

  it("točan višekratnik ne dobiva komad viška", () => {
    expect(jednaStavka({ ...WPC, unos: "m2", kolicina: 12.544 }).komada).toBe(28);
    expect(jednaStavka({ cijenaKomFen: 100, m2PoKomadu: 0.72, unos: "m2", kolicina: 7.2 }).komada).toBe(10);
  });

  it("malo iznad višekratnika ide naviše", () => {
    expect(jednaStavka({ ...WPC, unos: "m2", kolicina: 0.449 }).komada).toBe(2);
    expect(jednaStavka({ ...WPC, unos: "m2", kolicina: 0.01 }).komada).toBe(1);
  });

  it("unos u komadima: m² samo informativno", () => {
    expect(jednaStavka({ ...WPC, unos: "kom", kolicina: 3 })).toEqual({ komada: 3, m2: 1.344, iznosFen: 6600 });
  });

  it("obloga bez m² po komadu u komadima: m² je null", () => {
    const r = izracunaj({ stavke: [{ cijenaKomFen: 4500, m2PoKomadu: null, unos: "kom", kolicina: 2 }], pdv: BEZ_PDV });
    expect(r.stavke[0]).toEqual({ komada: 2, m2: null, iznosFen: 9000 });
    expect(r.predlozeniM2Ugradnje).toBe(0);
  });
});

describe("izracunaj – predloženi m² ugradnje", () => {
  it("zbroj upisanih m² i komada × m² po komadu", () => {
    const r = izracunaj({
      stavke: [
        { ...WPC, unos: "m2", kolicina: 10 },
        { ...WPC, unos: "kom", kolicina: 5 }, // 2,24 m²
        { cijenaKomFen: 1000, m2PoKomadu: null, unos: "kom", kolicina: 4 },
      ],
      pdv: BEZ_PDV,
    });
    expect(r.predlozeniM2Ugradnje).toBe(12.24);
  });

  it("zaokružuje na 2 decimale, pola naviše", () => {
    const kom = (kolicina: number) => izracunaj({ stavke: [{ ...WPC, unos: "kom", kolicina }], pdv: BEZ_PDV });
    expect(kom(28).predlozeniM2Ugradnje).toBe(12.54); // 12,544
    expect(kom(28).stavke[0].m2).toBe(12.544);
    const pola = izracunaj({ stavke: [{ cijenaKomFen: 100, m2PoKomadu: 0.0125, unos: "kom", kolicina: 1 }], pdv: BEZ_PDV });
    expect(pola.predlozeniM2Ugradnje).toBe(0.01); // 0,0125 → 0,01
    const pola2 = izracunaj({ stavke: [{ cijenaKomFen: 100, m2PoKomadu: 0.0125, unos: "kom", kolicina: 2 }], pdv: BEZ_PDV });
    expect(pola2.predlozeniM2Ugradnje).toBe(0.03); // 0,025 → 0,03
  });
});

describe("izracunaj – popust", () => {
  const stavke = [{ ...WPC, unos: "kom" as const, kolicina: 10 }]; // 220,00 KM

  it("postotak s decimalama", () => {
    const r = izracunaj({ stavke, popust: { tip: "posto", vrijednost: 7.5 }, pdv: BEZ_PDV });
    expect(r.popustFen).toBe(1650);
    expect(r.ukupnoFen).toBe(20350);
  });

  it("popust u KM", () => {
    const r = izracunaj({ stavke, popust: { tip: "km", vrijednost: 20.5 }, pdv: BEZ_PDV });
    expect(r.popustFen).toBe(2050);
    expect(r.ukupnoFen).toBe(19950);
    expect(r.popustOgranicen).toBe(false);
  });

  it("popust u KM veći od međuzbroja se ograniči i označi", () => {
    const r = izracunaj({ stavke, popust: { tip: "km", vrijednost: 300 }, pdv: NETO });
    expect(r.popustFen).toBe(22000);
    expect(r.popustOgranicen).toBe(true);
    expect(r.nakonPopustaFen).toBe(0);
    expect(r.pdvFen).toBe(0);
    expect(r.ukupnoFen).toBe(0);
  });

  it("popust jednak međuzbroju nije označen kao ograničen", () => {
    expect(izracunaj({ stavke, popust: { tip: "km", vrijednost: 220 }, pdv: BEZ_PDV }).popustOgranicen).toBe(false);
    expect(izracunaj({ stavke, popust: { tip: "posto", vrijednost: 100 }, pdv: BEZ_PDV }).popustOgranicen).toBe(false);
  });

  it("bez popusta", () => {
    const r = izracunaj({ stavke, pdv: BEZ_PDV });
    expect(r.popustFen).toBe(0);
    expect(r.ukupnoFen).toBe(22000);
  });
});

describe("izracunaj – dodaci i prazne stavke", () => {
  it("isključeni dodaci daju 0, međuzbroj = stavke", () => {
    const r = izracunaj({ stavke: [{ ...WPC, unos: "m2", kolicina: 12.5 }], pdv: BEZ_PDV });
    expect(r.ugradnjaFen).toBe(0);
    expect(r.ljepiloFen).toBe(0);
    expect(r.prijevozFen).toBe(0);
    expect(r.dodaciFen).toBe(0);
    expect(r.medjuzbrojFen).toBe(61600);
  });

  it("bez stavki, samo prijevoz", () => {
    const r = izracunaj({ stavke: [], prijevozFen: 2500, pdv: NETO });
    expect(r.stavke).toEqual([]);
    expect(r.medjuzbrojFen).toBe(2500);
    expect(r.pdvFen).toBe(425);
    expect(r.ukupnoFen).toBe(2925);
  });

  it("potpuno prazno daje sve nule", () => {
    const r = izracunaj({ stavke: [], pdv: SA_PDV });
    expect(r).toMatchObject({ stavkeFen: 0, dodaciFen: 0, medjuzbrojFen: 0, popustFen: 0, osnovicaFen: 0, pdvFen: 0, ukupnoFen: 0, predlozeniM2Ugradnje: 0 });
  });
});

describe("izracunaj – granične decimale", () => {
  it("ugradnja: pola feninga ide naviše", () => {
    expect(izracunaj({ stavke: [], ugradnja: { m2: 0.01, cijenaM2Fen: 50 }, pdv: BEZ_PDV }).ugradnjaFen).toBe(1);
    expect(izracunaj({ stavke: [], ugradnja: { m2: 0.01, cijenaM2Fen: 49 }, pdv: BEZ_PDV }).ugradnjaFen).toBe(0);
  });

  it("postotak: pola feninga ide naviše", () => {
    const r = izracunaj({ stavke: [{ cijenaKomFen: 100, m2PoKomadu: null, unos: "kom", kolicina: 1 }], popust: { tip: "posto", vrijednost: 1.5 }, pdv: BEZ_PDV });
    expect(r.popustFen).toBe(2); // 1,5 fen → 2
  });

  it("PDV bez PDV-a u cijeni: pola feninga ide naviše", () => {
    // 50 fen × 17 % = 8,5 fen → 9
    expect(izracunaj({ stavke: [], prijevozFen: 50, pdv: NETO }).pdvFen).toBe(9);
  });

  it("decimalni zapis m² ne kvari izračun (0,1 + 0,2)", () => {
    const r = izracunaj({ stavke: [], ugradnja: { m2: 0.1 + 0.2, cijenaM2Fen: 1000 }, pdv: BEZ_PDV });
    expect(r.ugradnjaFen).toBe(300);
  });

  it("stopa PDV-a s decimalama", () => {
    const r = izracunaj({ stavke: [], prijevozFen: 10000, pdv: { uSustavu: true, cijeneSaPdv: false, stopa: 17.5 } });
    expect(r.pdvFen).toBe(1750);
  });
});

describe("izracunaj – neispravan ulaz baca grešku", () => {
  const stavka = (s: Partial<UlazKalkulacije["stavke"][number]>) => () =>
    izracunaj({ stavke: [{ ...WPC, unos: "kom", kolicina: 1, ...s }], pdv: BEZ_PDV });

  it("unos u m² za oblogu bez m² po komadu", () => {
    expect(stavka({ m2PoKomadu: null, unos: "m2", kolicina: 5 })).toThrow(/m² po komadu/);
  });

  it("količina 0 ili negativna", () => {
    expect(stavka({ kolicina: 0 })).toThrow();
    expect(stavka({ kolicina: -2 })).toThrow();
    expect(stavka({ unos: "m2", kolicina: 0 })).toThrow();
    expect(stavka({ unos: "m2", kolicina: -1.5 })).toThrow();
  });

  it("komadi nisu cijeli broj", () => {
    expect(stavka({ kolicina: 2.5 })).toThrow();
  });

  it("NaN i beskonačno", () => {
    expect(stavka({ kolicina: NaN })).toThrow();
    expect(stavka({ cijenaKomFen: Infinity })).toThrow();
    expect(() => izracunaj({ stavke: [], pdv: { ...NETO, stopa: NaN } })).toThrow();
  });

  it("popust u postocima veći od 100 ili negativan popust", () => {
    expect(() => izracunaj({ stavke: [], popust: { tip: "posto", vrijednost: 101 }, pdv: BEZ_PDV })).toThrow();
    expect(() => izracunaj({ stavke: [], popust: { tip: "km", vrijednost: -1 }, pdv: BEZ_PDV })).toThrow();
  });

  it("negativna cijena ili prijevoz", () => {
    expect(stavka({ cijenaKomFen: -100 })).toThrow();
    expect(() => izracunaj({ stavke: [], prijevozFen: -1, pdv: BEZ_PDV })).toThrow();
  });

  it("feninzi nisu cijeli broj", () => {
    expect(stavka({ cijenaKomFen: 22.5 })).toThrow();
    expect(() => izracunaj({ stavke: [], ljepilo: { kom: 1, cijenaFen: 0.5 }, pdv: BEZ_PDV })).toThrow();
  });

  it("neispravni dodaci", () => {
    expect(() => izracunaj({ stavke: [], ugradnja: { m2: 0, cijenaM2Fen: 1500 }, pdv: BEZ_PDV })).toThrow();
    expect(() => izracunaj({ stavke: [], ljepilo: { kom: 0, cijenaFen: 1200 }, pdv: BEZ_PDV })).toThrow();
  });

  it("negativna stopa PDV-a", () => {
    expect(() => izracunaj({ stavke: [], pdv: { ...NETO, stopa: -17 } })).toThrow();
  });
});

describe("kmUFen / fenUKm", () => {
  it("pretvara u oba smjera", () => {
    expect(kmUFen(22)).toBe(2200);
    expect(kmUFen(832.67)).toBe(83267);
    expect(kmUFen(0.1 + 0.2)).toBe(30);
    expect(fenUKm(83267)).toBe(832.67);
    expect(fenUKm(kmUFen(974.22))).toBe(974.22);
  });
});
