import { describe, expect, it } from "vitest";
import { IZJAVA_IZVAN_PDV, imeDatoteke, modelPdf, tekstPoruke, type FirmaPdf, type PredracunZaPdf } from "./pdf";

/** Podaci firme kao u Excel predlošku „Predračun Obloga.ba.xlsx”. */
const FIRMA: FirmaPdf = {
  naziv_firme: "ERCEG",
  vlasnik: "Jela Klarić",
  adresa: "Sarajevska bb",
  mjesto: "72230 Žepče",
  telefon: "+387 63 766 063",
  jib: "4321177240007",
  pdv_broj: "200000000000",
  banka: "Raiffeisen Bank",
  transakcijski_racun: "1610000376200058",
  web: "www.obloga.ba",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  viber: "Viber",
};

/** PRD §6.4: WPC 12,5 m² + sva tri dodatka, popust 5 %, u sustavu PDV-a (cijene s PDV-om). */
function primjer(izmjene: Partial<PredracunZaPdf> = {}): PredracunZaPdf {
  return {
    broj: "23-26.",
    updated_at: "2026-11-18T10:00:00Z",
    kupac_ime: "Mirko Mandura",
    kupac_telefon: "067 10 08 437",
    kupac_mjesto: "Matina",
    kupac_adresa: null,
    kupac_jib: null,
    svrha: null,
    nacin_placanja: "gotovinsko",
    datum_isporuke: null,
    vrijedi_dana: 15,
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
        popust_tip: null,
        popust_vrijednost: null,
        popust_iznos: 0,
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
  it("broj iz Excela: bez završne točke u imenu", () => {
    expect(imeDatoteke("23-26.")).toBe("Predracun-23-26.pdf");
  });

  it("čudni znakovi ne ulaze u ime datoteke", () => {
    expect(imeDatoteke("PR 2026/001")).toBe("Predracun-PR-2026-001.pdf");
  });

  it("kratka poruka s brojem i firmom, bez dvostruke točke", () => {
    expect(tekstPoruke("23-26.", "ERCEG")).toBe("Poštovani, u privitku je predračun br. 23-26.\nERCEG");
    expect(tekstPoruke("PR-2026-014", "ERCEG")).toBe("Poštovani, u privitku je predračun br. PR-2026-014.\nERCEG");
  });
});

describe("modelPdf", () => {
  it("PRD §6.4: stavka u m², ljepilo u tablici, ugradnja posebno, popust i PDV u zbroju", () => {
    expect(modelPdf(primjer(), FIRMA)).toEqual({
      broj: "23-26.",
      datum: "18.11.2026.",
      vrijedi: "15 dana",
      imeDatoteke: "Predracun-23-26.pdf",
      tekstPoruke: "Poštovani, u privitku je predračun br. 23-26.\nERCEG",
      firma: {
        naziv: "ERCEG",
        vlasnik: "vl. Jela Klarić",
        retci: [
          "Sarajevska bb; 72230 Žepče",
          "JIB: 4321177240007",
          "PDV broj: 200000000000",
          "Telefon: +387 63 766 063",
          "Transakcijski račun: 1610000376200058",
          "Raiffeisen Bank",
        ],
      },
      kontakti: [
        { vrsta: "web", tekst: "www.obloga.ba" },
        { vrsta: "instagram", tekst: "Instagram" },
        { vrsta: "whatsapp", tekst: "WhatsApp" },
        { vrsta: "viber", tekst: "Viber" },
      ],
      kupac: { ime: "Mirko Mandura", adresa: "Matina", jib: "", telefon: "067 10 08 437" },
      retci: [
        {
          rb: "1.",
          naziv: "WPC panel 16×280 – Svijetli hrast",
          kolicina: "28 (12,5 m²)",
          cijena: "22,00 KM",
          popust: "",
          iznos: "616,00 KM",
        },
        { rb: "2.", naziv: "Ljepilo", kolicina: "4", cijena: "12,00 KM", popust: "", iznos: "48,00 KM" },
      ],
      ugradnja: { rb: "1.", naziv: "Ugradnja", m2: "12,5", cijenaM2: "15,00 KM", iznos: "187,50 KM" },
      zbroj: [
        { naziv: "Ukupna cijena materijala:", iznos: "664,00 KM" },
        { naziv: "Ugradnja:", iznos: "187,50 KM" },
        { naziv: "Cijena dostave:", iznos: "25,00 KM" },
        { naziv: "Popust 5%:", iznos: "−43,83 KM" },
        { naziv: "Osnovica:", iznos: "711,68 KM" },
        { naziv: "PDV 17%:", iznos: "120,99 KM" },
      ],
      ukupno: "832,67 KM",
      datumIsporuke: "",
      nacinPlacanja: "gotovinsko",
      svrha: "",
      napomenaPdv: "PDV uračunat u cijene",
      izjavaPdv: null,
    });
  });

  it("kao Excel: bez dodataka, popusta i PDV-a; dostava prazna, izjava o PDV-u na dnu", () => {
    const m = modelPdf(JEDNOSTAVAN, FIRMA);
    expect(m.retci).toEqual([
      { rb: "1.", naziv: "WPC panel 16×280 – Svijetli hrast", kolicina: "3", cijena: "22,00 KM", popust: "", iznos: "66,00 KM" },
    ]);
    expect(m.ugradnja).toBeNull();
    expect(m.zbroj).toEqual([
      { naziv: "Ukupna cijena materijala:", iznos: "66,00 KM" },
      { naziv: "Cijena dostave:", iznos: "" },
    ]);
    expect(m.ukupno).toBe("66,00 KM");
    expect(m.firma.retci).not.toContain("PDV broj: 200000000000");
    expect(m.napomenaPdv).toBe("PDV uračunat u cijene");
    expect(m.izjavaPdv).toBe(IZJAVA_IZVAN_PDV);
  });

  it("popust stavke: u stupcu Popust %, Vrijednost nakon popusta; ukupni popust samo u zbroju", () => {
    const wpc = primjer().stavke[0];
    // 28 × 22 = 616; −10 % = 554,40. Druga stavka 3 × 22 = 66; −6 KM = 60. Materijal = 614,40 + ljepilo 48.
    const m = modelPdf(
      primjer({
        stavke: [
          { ...wpc, popust_tip: "posto", popust_vrijednost: 10, popust_iznos: 61.6, iznos: 554.4 },
          { ...wpc, artikl_id: 8, naziv: "PVC panel", unos: "kom", unesena_m2: null, komada: 3, popust_tip: "km", popust_vrijednost: 6, popust_iznos: 6, iznos: 60 },
        ],
      }),
      FIRMA,
    );
    expect(m.retci.map((r) => [r.popust, r.iznos])).toEqual([
      ["10%", "554,40 KM"],
      ["6,00 KM", "60,00 KM"],
      ["", "48,00 KM"],
    ]);
    expect(m.zbroj[0]).toEqual({ naziv: "Ukupna cijena materijala:", iznos: "662,40 KM" });
    expect(m.zbroj).toContainEqual({ naziv: "Popust 5%:", iznos: "−43,83 KM" });
  });

  it("popust u KM: stupac Popust % ostaje prazan, iznos je u zbroju", () => {
    const m = modelPdf(
      { ...JEDNOSTAVAN, popust_tip: "km", popust_vrijednost: 6, popust_iznos: 6, osnovica: 60, ukupno: 60 },
      FIRMA,
    );
    expect(m.retci[0].popust).toBe("");
    expect(m.zbroj.at(-1)).toEqual({ naziv: "Popust:", iznos: "−6,00 KM" });
    expect(m.ukupno).toBe("60,00 KM");
  });

  it("u sustavu PDV-a s cijenama bez PDV-a", () => {
    const m = modelPdf(primjer({ pdv_cijene_sa_pdv: false }), FIRMA);
    expect(m.napomenaPdv).toBe("Cijene su bez PDV-a");
    expect(m.izjavaPdv).toBeNull();
  });

  it("uvjeti i podaci kupca s PDF-a", () => {
    const m = modelPdf(
      primjer({
        kupac_adresa: " Glavna 12 ",
        kupac_jib: "4200000000000",
        svrha: "Dnevni boravak",
        datum_isporuke: "2026-12-01",
        vrijedi_dana: 21,
        nacin_placanja: "virman",
      }),
      FIRMA,
    );
    expect(m.kupac).toEqual({ ime: "Mirko Mandura", adresa: "Glavna 12, Matina", jib: "4200000000000", telefon: "067 10 08 437" });
    expect(m).toMatchObject({ datumIsporuke: "01.12.2026.", vrijedi: "21 dan", svrha: "Dnevni boravak", nacinPlacanja: "virman" });
  });

  it("interna napomena ne ide na PDF", () => {
    expect(JSON.stringify(modelPdf(primjer(), FIRMA))).not.toContain("Zove poslije 16h");
  });

  it("prazni podaci kupca, firme i kontakti se preskaču", () => {
    const m = modelPdf(
      primjer({ kupac_ime: " ", kupac_telefon: null, kupac_mjesto: "Žepče", vrijedi_dana: null, nacin_placanja: null }),
      { ...FIRMA, vlasnik: " ", adresa: null, telefon: null, jib: "", pdv_broj: null, banka: null, instagram: "", viber: null },
    );
    expect(m.kupac).toEqual({ ime: "", adresa: "Žepče", jib: "", telefon: "" });
    expect(m.firma).toEqual({ naziv: "ERCEG", vlasnik: "", retci: ["72230 Žepče", "Transakcijski račun: 1610000376200058"] });
    expect(m.kontakti.map((k) => k.vrsta)).toEqual(["web", "whatsapp"]);
    expect(m.vrijedi).toBe("");
    expect(m.nacinPlacanja).toBe("");
  });

  it("predračun bez broja se odbija", () => {
    expect(() => modelPdf(primjer({ broj: null }), FIRMA)).toThrow();
  });
});
