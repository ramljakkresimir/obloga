import { describe, expect, it } from "vitest";
import {
  cijenaPoM2,
  inicijali,
  m2IzDimenzija,
  normalizirajZaPretragu,
  oblogeNaNiskomStanju,
  vrstaStanja,
} from "./obloge";

describe("vrstaStanja", () => {
  it("minus kad je stanje negativno", () => {
    expect(vrstaStanja(-8, 10)).toBe("minus");
    expect(vrstaStanja(-1, 0)).toBe("minus");
  });

  it("nema kad je stanje 0, bez obzira na minimum", () => {
    expect(vrstaStanja(0, 0)).toBe("nema");
    expect(vrstaStanja(0, 10)).toBe("nema");
  });

  it("nisko kad je 0 < stanje ≤ minimum", () => {
    expect(vrstaStanja(3, 10)).toBe("nisko");
    expect(vrstaStanja(10, 10)).toBe("nisko");
    expect(vrstaStanja(1, 1)).toBe("nisko");
  });

  it("bez oznake iznad minimuma", () => {
    expect(vrstaStanja(11, 10)).toBeNull();
    expect(vrstaStanja(48, 0)).toBeNull();
  });
});

describe("oblogeNaNiskomStanju", () => {
  const o = (naziv: string, stanje: number, min_stanje: number, aktivan = true) => ({
    naziv,
    stanje,
    min_stanje,
    aktivan,
  });

  it("uzima minus, 0 kom i nisko; izbacuje one iznad minimuma i arhivirane", () => {
    const rezultat = oblogeNaNiskomStanju([
      o("Iznad", 11, 10),
      o("Nisko", 3, 10),
      o("Nula bez minimuma", 0, 0),
      o("Minus", -8, 5),
      o("Arhivirana", -2, 5, false),
      o("Bez minimuma", 48, 0),
    ]);
    expect(rezultat.map((x) => x.naziv)).toEqual(["Minus", "Nula bez minimuma", "Nisko"]);
  });

  it("najmanje stanje prvo, isto stanje abecedno (hr)", () => {
    const rezultat = oblogeNaNiskomStanju([o("Žuti", 2, 5), o("Crni", 2, 5), o("Čokolada", 2, 5), o("Bijeli", 0, 5)]);
    expect(rezultat.map((x) => x.naziv)).toEqual(["Bijeli", "Crni", "Čokolada", "Žuti"]);
  });

  it("ne mijenja ulazni niz", () => {
    const ulaz = [o("B", 3, 5), o("A", -1, 5)];
    oblogeNaNiskomStanju(ulaz);
    expect(ulaz.map((x) => x.naziv)).toEqual(["B", "A"]);
  });
});

describe("m2IzDimenzija", () => {
  it("16 × 280 cm = 0,448 m²", () => {
    expect(m2IzDimenzija(16, 280)).toBe(0.448);
    expect(m2IzDimenzija(60, 120)).toBe(0.72);
    expect(m2IzDimenzija(122, 280)).toBe(3.416);
  });

  it("zaokružuje na 4 decimale", () => {
    expect(m2IzDimenzija(12.5, 33.3)).toBe(0.0416);
  });

  it("bez obje dimenzije → null", () => {
    expect(m2IzDimenzija(null, 280)).toBeNull();
    expect(m2IzDimenzija(16, null)).toBeNull();
    expect(m2IzDimenzija(0, 280)).toBeNull();
  });
});

describe("cijenaPoM2", () => {
  it("22,00 KM/kom ÷ 0,448 m² ≈ 49,11 KM/m²", () => {
    expect(cijenaPoM2(22, 0.448)).toBeCloseTo(49.107, 3);
  });

  it("bez m² → null", () => {
    expect(cijenaPoM2(22, null)).toBeNull();
  });
});

describe("normalizirajZaPretragu", () => {
  it("bez dijakritika i velikih slova", () => {
    expect(normalizirajZaPretragu("Žuti ČEŠALJ ćošak Đurđica")).toBe("zuti cesalj cosak durdica");
  });
});

describe("inicijali", () => {
  it("prva slova prve dvije riječi", () => {
    expect(inicijali("WPC panel 16×280 – Svijetli hrast")).toBe("WP");
    expect(inicijali("čelik")).toBe("Č");
    expect(inicijali("")).toBe("?");
  });
});
