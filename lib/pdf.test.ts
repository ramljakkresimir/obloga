import { describe, expect, it } from "vitest";
import { imeDatoteke, modelPdf, tekstPoruke, type FirmaPdf, type PredracunZaPdf } from "./pdf";

const FIRMA: FirmaPdf = {
  naziv_firme: "Obloga.ba",
  adresa: "Sarajevska b.b.",
  mjesto: "72230 Žepče",
  telefon: "+387 63 766 063",
  email: "info@obloga.ba",
  jib: "4200000000000",
  pdv_broj: "200000000000",
};

/** PRD §6.4: WPC 12,5 m² + sva tri dodatka, popust 5 %, u sustavu PDV-a (cijene s PDV-om). */
function primjer(izmjene: Partial<PredracunZaPdf> = {}): PredracunZaPdf {
  return {
    broj: "PR-2026-014",
    updated_at: "2026-11-18T10:00:00Z",
    kupac_ime: "Amir H.",
    kupac_telefon: "061 123 456",
    kupac_mjesto: "Sarajevo",
    napomena: "Zove poslije 16h",
    ugradnja_m2: 12.5,
    ugradnja_cijena_m2: 15,
    ljepilo_kom: 4,
    ljepilo_cijena: 12,
    prijevoz: 25,
    popust_tip: "posto",
    popust_vrijednost: 5,
    stavke: [
      {
        artikl_id: 7,
        naziv: "WPC panel 16×280 – Svijetli hrast",
        cijena_kom: 22,
        m2_po_komadu: 0.448,
        unos: "m2",
        unesena_m2: 12.5,
        komada: 28,
        slika: null,
        iznos: 616,
      },
    ],
    pdv_u_sustavu: true,
    pdv_cijene_sa_pdv: true,
    pdv_stopa: 17,
    medjuzbroj: 876.5,
    popust_iznos: 43.83,
    osnovica: 711.68,
    pdv_iznos: 120.99,
    ukupno: 832.67,
    ...izmjene,
  };
}

/** Isti predračun bez dodataka, popusta i PDV-a, s unosom u komadima. */
const JEDNOSTAVAN = primjer({
  ugradnja_m2: null,
  ugradnja_cijena_m2: null,
  ljepilo_kom: null,
  ljepilo_cijena: null,
  prijevoz: null,
  popust_tip: null,
  popust_vrijednost: null,
  stavke: [{ ...primjer().stavke[0], unos: "kom", unesena_m2: null, komada: 3, iznos: 66 }],
  pdv_u_sustavu: false,
  medjuzbroj: 66,
  popust_iznos: 0,
  osnovica: 66,
  pdv_iznos: 0,
  ukupno: 66,
});

describe("imeDatoteke i tekstPoruke", () => {
  it("ime datoteke prema PRD-u", () => {
    expect(imeDatoteke("PR-2026-001")).toBe("Predracun-PR-2026-001.pdf");
  });

  it("čudni znakovi ne ulaze u ime datoteke", () => {
    expect(imeDatoteke("PR 2026/001")).toBe("Predracun-PR-2026-001.pdf");
  });

  it("kratka poruka s brojem i firmom", () => {
    expect(tekstPoruke("PR-2026-014", "Obloga.ba")).toBe("Poštovani, u privitku je predračun PR-2026-014.\nObloga.ba");
  });
});

describe("modelPdf", () => {
  it("PRD §6.4: stavka u m², dodaci, popust i PDV razrada", () => {
    expect(modelPdf(primjer(), FIRMA)).toEqual({
      broj: "PR-2026-014",
      datum: "18. 11. 2026.",
      imeDatoteke: "Predracun-PR-2026-014.pdf",
      tekstPoruke: "Poštovani, u privitku je predračun PR-2026-014.\nObloga.ba",
      firma: {
        naziv: "Obloga.ba",
        retci: ["Sarajevska b.b., 72230 Žepče", "+387 63 766 063 · info@obloga.ba", "JIB: 4200000000000", "PDV broj: 200000000000"],
      },
      kupac: ["Amir H.", "061 123 456", "Sarajevo"],
      retci: [
        { rb: 1, opis: "WPC panel 16×280 – Svijetli hrast", kolicina: "28 kom (12,5 m²)", cijena: "22,00 KM", iznos: "616,00 KM" },
        { rb: 2, opis: "Ugradnja", kolicina: "12,5 m²", cijena: "15,00 KM", iznos: "187,50 KM" },
        { rb: 3, opis: "Ljepilo", kolicina: "4 kom", cijena: "12,00 KM", iznos: "48,00 KM" },
        { rb: 4, opis: "Prijevoz", kolicina: "1", cijena: "25,00 KM", iznos: "25,00 KM" },
      ],
      sazetak: [
        { naziv: "Međuzbroj", iznos: "876,50 KM", istaknuto: true },
        { naziv: "Popust 5 %", iznos: "−43,83 KM" },
        { naziv: "Iznos nakon popusta", iznos: "832,67 KM" },
        { naziv: "Osnovica", iznos: "711,68 KM" },
        { naziv: "PDV 17 %", iznos: "120,99 KM" },
      ],
      ukupno: "832,67 KM",
      podnozje: "Obloga.ba · +387 63 766 063 · info@obloga.ba",
    });
  });

  it("bez dodataka, popusta i PDV-a: samo stavke i UKUPNO, bez PDV broja", () => {
    const m = modelPdf(JEDNOSTAVAN, FIRMA);
    expect(m.retci).toEqual([
      { rb: 1, opis: "WPC panel 16×280 – Svijetli hrast", kolicina: "3 kom", cijena: "22,00 KM", iznos: "66,00 KM" },
    ]);
    expect(m.sazetak).toEqual([]);
    expect(m.ukupno).toBe("66,00 KM");
    expect(m.firma.retci).not.toContain("PDV broj: 200000000000");
  });

  it("popust u KM bez PDV-a", () => {
    const m = modelPdf(
      { ...JEDNOSTAVAN, popust_tip: "km", popust_vrijednost: 6, popust_iznos: 6, osnovica: 60, ukupno: 60 },
      FIRMA,
    );
    expect(m.sazetak).toEqual([
      { naziv: "Međuzbroj", iznos: "66,00 KM", istaknuto: true },
      { naziv: "Popust", iznos: "−6,00 KM" },
    ]);
    expect(m.ukupno).toBe("60,00 KM");
  });

  it("interna napomena ne ide na PDF", () => {
    expect(JSON.stringify(modelPdf(primjer(), FIRMA))).not.toContain("Zove poslije 16h");
  });

  it("prazni podaci kupca i firme se preskaču", () => {
    const m = modelPdf(primjer({ kupac_ime: " ", kupac_telefon: null, kupac_mjesto: "Žepče" }), {
      ...FIRMA,
      adresa: null,
      telefon: null,
      jib: "",
      pdv_broj: null,
    });
    expect(m.kupac).toEqual(["Žepče"]);
    expect(m.firma.retci).toEqual(["72230 Žepče", "info@obloga.ba"]);
    expect(m.podnozje).toBe("Obloga.ba · info@obloga.ba");
  });

  it("predračun bez broja se odbija", () => {
    expect(() => modelPdf(primjer({ broj: null }), FIRMA)).toThrow();
  });
});
