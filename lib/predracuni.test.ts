import { describe, expect, it } from "vitest";
import {
  iznosiSpremljenog,
  iznosiRazrade,
  izracunajPredracun,
  jeIspravanDatum,
  kljucPopustaStavke,
  manjak,
  podaciZaRpc,
  prazanUredivac,
  predlozeniM2,
  procitajUredivac,
  uPolje,
  uredivacIzKopije,
  uredivacIzPredracuna,
  type PdvPostavke,
  type SnimakStavke,
  type SpremljeniPredracun,
  type StanjeUredivaca,
  type StavkaUredivaca,
} from "./predracuni";

const BEZ_PDV: PdvPostavke = { uSustavu: false, cijeneSaPdv: false, stopa: 17 };
const NETO: PdvPostavke = { uSustavu: true, cijeneSaPdv: false, stopa: 17 };

const WPC: StavkaUredivaca = {
  artiklId: 7,
  naziv: "WPC panel 16×280 – Svijetli hrast",
  slika: null,
  cijenaKom: 22,
  m2PoKomadu: 0.448,
  unos: "m2",
  kolicina: "12,5",
  popust: { tip: "posto", vrijednost: "" },
};

/** PRD §6.4 u obliku polja uređivača. */
function primjer(): StanjeUredivaca {
  return {
    ...prazanUredivac(),
    kupacIme: "  Amir H. ",
    stavke: [WPC],
    ugradnja: { ukljucena: true, m2: "", rucno: false, cijenaM2: "15" },
    ljepilo: { ukljuceno: true, kom: "4", cijena: "12,00" },
    prijevoz: { ukljucen: true, iznos: "25" },
    popust: { tip: "posto", vrijednost: "5" },
  };
}

function snimakIz(s: StanjeUredivaca): Map<number, SnimakStavke> {
  return new Map(s.stavke.map((st) => [st.artiklId, st]));
}

describe("procitajUredivac + izracunajPredracun", () => {
  it("PRD §6.4: 28 kom, ugradnja po prijedlogu 12,5 m², ukupno 832,67", () => {
    const s = primjer();
    expect(predlozeniM2(s)).toBe(12.5);

    const { podaci, greske } = procitajUredivac(s, predlozeniM2(s));
    expect(greske).toEqual({});
    expect(podaci.kupacIme).toBe("Amir H.");
    expect(podaci.ugradnja).toEqual({ m2: 12.5, cijenaM2: 15 });

    const { rezultat } = izracunajPredracun(podaci, snimakIz(s), BEZ_PDV);
    expect(rezultat.stavke[0].komada).toBe(28);
    expect(rezultat.medjuzbrojFen).toBe(87650);
    expect(rezultat.ukupnoFen).toBe(83267);
  });

  it("ručno upisani m² ugradnje imaju prednost pred prijedlogom", () => {
    const s = primjer();
    s.ugradnja = { ukljucena: true, m2: "10", rucno: true, cijenaM2: "15" };
    const { podaci } = procitajUredivac(s, predlozeniM2(s));
    expect(podaci.ugradnja).toEqual({ m2: 10, cijenaM2: 15 });
  });

  it("isključeni dodaci i prazan popust se ne šalju", () => {
    const s = { ...prazanUredivac(), stavke: [{ ...WPC, unos: "kom" as const, kolicina: "3" }] };
    const { podaci, greske } = procitajUredivac(s, 0);
    expect(greske).toEqual({});
    expect(podaci).toMatchObject({ ugradnja: null, ljepilo: null, prijevoz: null, popust: null });
  });

  it("popust 0 znači bez popusta", () => {
    const s = primjer();
    s.popust.vrijednost = "0";
    expect(procitajUredivac(s, 12.5).podaci.popust).toBeNull();
  });

  it("javlja greške po polju, a neispravnu stavku izostavlja iz izračuna", () => {
    const s: StanjeUredivaca = {
      ...prazanUredivac(),
      stavke: [
        { ...WPC, kolicina: "" },
        { ...WPC, artiklId: 8, unos: "kom", kolicina: "2,5", popust: { tip: "posto", vrijednost: "" } },
        { ...WPC, artiklId: 9, m2PoKomadu: null, unos: "m2", kolicina: "3", popust: { tip: "posto", vrijednost: "" } },
        { ...WPC, artiklId: 10, unos: "kom", kolicina: "4", popust: { tip: "posto", vrijednost: "" } },
      ],
      ugradnja: { ukljucena: true, m2: "", rucno: true, cijenaM2: "" },
      ljepilo: { ukljuceno: true, kom: "0", cijena: "-1" },
      prijevoz: { ukljucen: true, iznos: "" },
      popust: { tip: "posto", vrijednost: "120" },
      kupacIme: "x".repeat(121),
    };
    const { podaci, greske } = procitajUredivac(s, 0);
    expect(podaci.stavke).toEqual([{ artiklId: 10, unos: "kom", kolicina: 4, popust: null }]);
    expect(greske).toEqual({
      "stavka:7": "Upišite količinu.",
      "stavka:8": "Upišite cijeli broj.",
      "stavka:9": "Obloga nema m² po komadu. Upišite količinu u komadima.",
      ugradnja_m2: "Upišite m² za ugradnju.",
      ugradnja_cijena: "Upišite cijenu po m².",
      ljepilo_kom: "Upišite broj veći od 0.",
      ljepilo_cijena: "Broj ne može biti negativan.",
      prijevoz: "Upišite iznos prijevoza.",
      popust: "Popust može biti najviše 100 %.",
      kupac_ime: "Najviše 120 znakova.",
    });
  });

  it("bez stavki javlja grešku", () => {
    expect(procitajUredivac(prazanUredivac(), 0).greske.stavke).toBe("Dodajte barem jednu oblogu.");
  });

  it("m² s više od 2 decimale je greška (unesena_m2 je numeric(10,2))", () => {
    const s = { ...prazanUredivac(), stavke: [{ ...WPC, kolicina: "12,544" }] };
    expect(procitajUredivac(s, 0).greske["stavka:7"]).toBe("Najviše 2 decimale.");
  });
});

describe("uvjeti predračuna (idu na PDF)", () => {
  const sa = (izmjene: Partial<StanjeUredivaca>) => {
    const s = { ...primjer(), ...izmjene };
    return procitajUredivac(s, predlozeniM2(s));
  };

  it("novi predračun: gotovinsko, 15 dana, bez datuma isporuke", () => {
    const { podaci, greske } = sa({});
    expect(greske.vrijedi_dana).toBeUndefined();
    expect(podaci).toMatchObject({ nacinPlacanja: "gotovinsko", vrijediDana: 15, datumIsporuke: null, svrha: "" });
  });

  it("obrezuje tekst i čita datum i rok", () => {
    const { podaci, greske } = sa({
      kupacAdresa: "  Glavna 12 ",
      kupacJib: " 4200000000000 ",
      svrha: " Kuhinja ",
      nacinPlacanja: " virman ",
      datumIsporuke: "2026-12-01",
      vrijediDana: "30",
    });
    expect(greske).toEqual({});
    expect(podaci).toMatchObject({
      kupacAdresa: "Glavna 12",
      kupacJib: "4200000000000",
      svrha: "Kuhinja",
      nacinPlacanja: "virman",
      datumIsporuke: "2026-12-01",
      vrijediDana: 30,
    });
  });

  it("prazan rok = bez roka; neispravan rok je greška", () => {
    expect(sa({ vrijediDana: "" }).podaci.vrijediDana).toBeNull();
    expect(sa({ vrijediDana: "0" }).greske.vrijedi_dana).toBe("Upišite broj veći od 0.");
    expect(sa({ vrijediDana: "7,5" }).greske.vrijedi_dana).toBe("Upišite cijeli broj.");
    expect(sa({ vrijediDana: "400" }).greske.vrijedi_dana).toBe("Najviše 365 dana.");
  });

  it("nepostojeći datum isporuke je greška i ne šalje se", () => {
    const { podaci, greske } = sa({ datumIsporuke: "2026-02-30" });
    expect(greske.datum_isporuke).toBe("Upišite ispravan datum.");
    expect(podaci.datumIsporuke).toBeNull();
  });

  it("predugi tekst je greška", () => {
    expect(sa({ svrha: "x".repeat(201) }).greske.svrha).toBe("Najviše 200 znakova.");
    expect(sa({ kupacJib: "1".repeat(21) }).greske.kupac_jib).toBe("Najviše 20 znakova.");
  });

  it("jeIspravanDatum", () => {
    expect(jeIspravanDatum("2028-02-29")).toBe(true);
    expect(jeIspravanDatum("2026-02-29")).toBe(false);
    expect(jeIspravanDatum("1.12.2026")).toBe(false);
  });
});

describe("popust stavke", () => {
  const sPopustom = (popust: StavkaUredivaca["popust"]): StanjeUredivaca => ({
    ...prazanUredivac(),
    stavke: [{ ...WPC, unos: "kom", kolicina: "10", popust }], // 220,00 KM
    popust: { tip: "posto", vrijednost: "5" },
  });

  it("čita se, ulazi u izračun i u RPC; ukupni popust ide na zbroj nakon popusta stavke", () => {
    const s = sPopustom({ tip: "posto", vrijednost: "10" });
    const snimak = snimakIz(s);
    const { podaci, greske } = procitajUredivac(s, predlozeniM2(s));
    expect(greske).toEqual({});
    expect(podaci.stavke[0].popust).toEqual({ tip: "posto", vrijednost: 10 });
    const { ulaz, rezultat } = izracunajPredracun(podaci, snimak, BEZ_PDV);
    expect(rezultat.stavkeFen).toBe(19800);
    expect(rezultat.popustFen).toBe(990); // 5 % od 198,00
    expect(iznosiRazrade(ulaz, rezultat)).toMatchObject({ stavke: 198, popustStavki: 22, popust: 9.9, ukupno: 188.1 });
    expect(podaciZaRpc(podaci, snimak, BEZ_PDV, rezultat, null).stavke[0]).toMatchObject({
      popust_tip: "posto",
      popust_vrijednost: 10,
      popust_iznos: 22,
      iznos: 198,
    });
  });

  it("prazno ili 0 = bez popusta; neispravno je greška pod ključem stavke", () => {
    expect(procitajUredivac(sPopustom({ tip: "km", vrijednost: "0" }), 0).podaci.stavke[0].popust).toBeNull();
    expect(procitajUredivac(sPopustom({ tip: "posto", vrijednost: "" }), 0).podaci.stavke[0].popust).toBeNull();
    const { greske } = procitajUredivac(sPopustom({ tip: "posto", vrijednost: "120" }), 0);
    expect(greske[kljucPopustaStavke(7)]).toBe("Popust može biti najviše 100 %.");
  });

  it("Uredi i Kopiraj zadržavaju popust stavke", () => {
    const spremljeni: SpremljeniPredracun = {
      ...uredivacPrazanSpremljeni(),
      stavke: [
        { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 22, m2_po_komadu: 0.448, unos: "kom", unesena_m2: null, komada: 10, popust_tip: "km", popust_vrijednost: 15, slika: null },
      ],
    };
    expect(uredivacIzPredracuna(spremljeni).stavke[0].popust).toEqual({ tip: "km", vrijednost: "15" });
    const obloge = new Map([[7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 24, m2_po_komadu: 0.448, aktivan: true }]]);
    expect(uredivacIzKopije(spremljeni, obloge).stanje.stavke[0].popust).toEqual({ tip: "km", vrijednost: "15" });
  });

  it("iznosiSpremljenog uzima popust stavke iz baze", () => {
    const r = iznosiSpremljenog({
      ...uredivacPrazanSpremljeni(),
      stavke: [
        { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 22, m2_po_komadu: 0.448, unos: "kom", unesena_m2: null, komada: 10, popust_tip: "posto", popust_vrijednost: 10, slika: null },
      ],
      pdv_u_sustavu: false,
      pdv_cijene_sa_pdv: true,
      pdv_stopa: 17,
      medjuzbroj: 198,
      popust_iznos: 0,
      osnovica: 198,
      pdv_iznos: 0,
      ukupno: 198,
    });
    expect(r).toMatchObject({ stavke: 198, popustStavki: 22 });
  });
});

/** Spremljeni predračun bez kupca, dodataka i popusta (za testove popusta stavke). */
function uredivacPrazanSpremljeni(): SpremljeniPredracun {
  return {
    kupac_ime: null,
    kupac_telefon: null,
    kupac_mjesto: null,
    kupac_adresa: null,
    kupac_jib: null,
    svrha: null,
    nacin_placanja: null,
    datum_isporuke: null,
    vrijedi_dana: null,
    napomena: null,
    ugradnja_m2: null,
    ugradnja_cijena_m2: null,
    ljepilo_kom: null,
    ljepilo_cijena: null,
    prijevoz: null,
    popust_tip: null,
    popust_vrijednost: null,
    stavke: [],
  };
}

describe("podaciZaRpc", () => {
  it("PRD §6.4, cijene bez PDV-a: iznosi u KM i snimak stavke", () => {
    const s = primjer();
    const snimak = snimakIz(s);
    const { podaci } = procitajUredivac(s, predlozeniM2(s));
    const { rezultat } = izracunajPredracun(podaci, snimak, NETO);

    expect(podaciZaRpc(podaci, snimak, NETO, rezultat, 3)).toEqual({
      kupac_ime: "Amir H.",
      kupac_telefon: "",
      kupac_mjesto: "",
      kupac_adresa: "",
      kupac_jib: "",
      svrha: "",
      nacin_placanja: "gotovinsko",
      datum_isporuke: null,
      vrijedi_dana: 15,
      napomena: "",
      ugradnja_m2: 12.5,
      ugradnja_cijena_m2: 15,
      ljepilo_kom: 4,
      ljepilo_cijena: 12,
      prijevoz: 25,
      popust_tip: "posto",
      popust_vrijednost: 5,
      pdv_u_sustavu: true,
      pdv_cijene_sa_pdv: false,
      pdv_stopa: 17,
      medjuzbroj: 876.5,
      popust_iznos: 43.83,
      osnovica: 832.67,
      pdv_iznos: 141.55,
      ukupno: 974.22,
      kopija_od: 3,
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
          iznos: 616,
        },
      ],
    });
  });

  it("stavka u komadima nema unesena_m2; bez dodataka su polja null", () => {
    const s = { ...prazanUredivac(), stavke: [{ ...WPC, unos: "kom" as const, kolicina: "3" }] };
    const snimak = snimakIz(s);
    const { podaci } = procitajUredivac(s, 0);
    const { rezultat } = izracunajPredracun(podaci, snimak, BEZ_PDV);
    const rpc = podaciZaRpc(podaci, snimak, BEZ_PDV, rezultat, null);
    expect(rpc.stavke[0]).toMatchObject({ unos: "kom", unesena_m2: null, komada: 3, iznos: 66 });
    expect(rpc).toMatchObject({ ugradnja_m2: null, ljepilo_kom: null, prijevoz: null, popust_tip: null, kopija_od: null });
  });
});

describe("manjak", () => {
  it("vraća samo obloge kojih nema dovoljno, s brojem koji nedostaje", () => {
    const stanje = new Map([
      [1, 20],
      [2, 50],
      [3, -4],
    ]);
    expect(
      manjak(
        [
          { artiklId: 1, naziv: "WPC Zlatni hrast", komada: 28 },
          { artiklId: 2, naziv: "PVC mramor", komada: 10 },
          { artiklId: 3, naziv: "Akustični panel", komada: 2 },
          { artiklId: 4, naziv: "Novi panel", komada: 1 },
        ],
        stanje,
      ),
    ).toEqual([
      { artiklId: 1, naziv: "WPC Zlatni hrast", treba: 28, ima: 20, nedostaje: 8 },
      { artiklId: 3, naziv: "Akustični panel", treba: 2, ima: -4, nedostaje: 2 },
      { artiklId: 4, naziv: "Novi panel", treba: 1, ima: 0, nedostaje: 1 },
    ]);
  });

  it("točno onoliko koliko ima nije manjak", () => {
    expect(manjak([{ artiklId: 1, naziv: "A", komada: 5 }], new Map([[1, 5]]))).toEqual([]);
  });
});

describe("Uredi i Kopiraj", () => {
  const spremljeni: SpremljeniPredracun = {
    kupac_ime: "Amir H.",
    kupac_telefon: "061 123 456",
    kupac_mjesto: "Sarajevo",
    kupac_adresa: "Glavna 12",
    kupac_jib: "4200000000000",
    svrha: "Dnevni boravak",
    nacin_placanja: "virman",
    datum_isporuke: "2026-12-01",
    vrijedi_dana: 30,
    napomena: "Javiti se u petak",
    ugradnja_m2: 12.5,
    ugradnja_cijena_m2: 15,
    ljepilo_kom: 4,
    ljepilo_cijena: 12,
    prijevoz: 1250.5,
    popust_tip: "km",
    popust_vrijednost: 40,
    stavke: [
      { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 22, m2_po_komadu: 0.448, unos: "m2", unesena_m2: 12.5, komada: 28, popust_tip: null, popust_vrijednost: null, slika: null },
      { artikl_id: 8, naziv: "Stari panel", cijena_kom: 10, m2_po_komadu: null, unos: "kom", unesena_m2: null, komada: 3, popust_tip: null, popust_vrijednost: null, slika: "/x.jpg" },
    ],
  };

  it("uredivacIzPredracuna zadržava snimak cijena i sva polja", () => {
    const s = uredivacIzPredracuna(spremljeni);
    expect(s.kupacIme).toBe("Amir H.");
    expect(s.napomena).toBe("Javiti se u petak");
    expect(s.stavke.map((x) => [x.artiklId, x.cijenaKom, x.unos, x.kolicina])).toEqual([
      [7, 22, "m2", "12,5"],
      [8, 10, "kom", "3"],
    ]);
    expect(s.ugradnja).toEqual({ ukljucena: true, m2: "12,5", rucno: true, cijenaM2: "15" });
    expect(s.prijevoz).toEqual({ ukljucen: true, iznos: "1250,5" });
    expect(s.popust).toEqual({ tip: "km", vrijednost: "40" });
    expect(s).toMatchObject({
      kupacAdresa: "Glavna 12",
      kupacJib: "4200000000000",
      svrha: "Dnevni boravak",
      nacinPlacanja: "virman",
      datumIsporuke: "2026-12-01",
      vrijediDana: "30",
    });
  });

  it("uredivacIzKopije: način plaćanja i rok ostaju, podaci vezani uz kupca se brišu", () => {
    const obloge = new Map([[7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 22, m2_po_komadu: 0.448, aktivan: true }]]);
    const { stanje } = uredivacIzKopije(spremljeni, obloge);
    expect(stanje).toMatchObject({
      kupacAdresa: "",
      kupacJib: "",
      svrha: "",
      datumIsporuke: "",
      nacinPlacanja: "virman",
      vrijediDana: "30",
    });
    // Stari predračun bez uvjeta: kopija dobiva zadane vrijednosti.
    const stari = uredivacIzKopije({ ...spremljeni, nacin_placanja: null, vrijedi_dana: null }, obloge).stanje;
    expect(stari).toMatchObject({ nacinPlacanja: "gotovinsko", vrijediDana: "15" });
  });

  it("uredivacIzKopije: trenutne cijene, prazan kupac, arhivirane preskočene", () => {
    const obloge = new Map([
      [7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 24.5, m2_po_komadu: 0.448, aktivan: true }],
      [8, { id: 8, naziv: "Stari panel", slika: null, cijena_kom: 10, m2_po_komadu: null, aktivan: false }],
    ]);
    const { stanje, preskocene } = uredivacIzKopije(spremljeni, obloge);
    expect(preskocene).toEqual(["Stari panel"]);
    expect(stanje.kupacIme).toBe("");
    expect(stanje.napomena).toBe("");
    expect(stanje.stavke).toEqual([
      { artiklId: 7, naziv: "WPC hrast", slika: null, cijenaKom: 24.5, m2PoKomadu: 0.448, unos: "m2", kolicina: "12,5", popust: { tip: "posto", vrijednost: "" } },
    ]);
    expect(stanje.ljepilo).toEqual({ ukljuceno: true, kom: "4", cijena: "12" });
  });

  it("uredivacIzKopije: obloga koja više nema m²/kom prelazi na komade", () => {
    const obloge = new Map([[7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 22, m2_po_komadu: null, aktivan: true }]]);
    const { stanje } = uredivacIzKopije({ ...spremljeni, stavke: [spremljeni.stavke[0]] }, obloge);
    expect(stanje.stavke[0]).toMatchObject({ unos: "kom", kolicina: "28", popust: { tip: "posto", vrijednost: "" } });
  });

  it("uPolje: zarez, bez točke tisućica", () => {
    expect(uPolje(12345.5)).toBe("12345,5");
    expect(uPolje(null)).toBe("");
    expect(uPolje(28, 0)).toBe("28");
  });
});

describe("Brza prodaja (isti uređivač stavki)", () => {
  const prodaja: SpremljeniPredracun = {
    kupac_ime: null,
    kupac_telefon: null,
    kupac_mjesto: null,
    kupac_adresa: null,
    kupac_jib: null,
    svrha: null,
    nacin_placanja: null,
    datum_isporuke: null,
    vrijedi_dana: null,
    napomena: "Platio gotovinom",
    ugradnja_m2: null,
    ugradnja_cijena_m2: null,
    ljepilo_kom: null,
    ljepilo_cijena: null,
    prijevoz: null,
    popust_tip: "posto",
    popust_vrijednost: 10,
    stavke: [
      { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 20, m2_po_komadu: 0.448, unos: "kom", unesena_m2: null, komada: 3, popust_tip: null, popust_vrijednost: null, slika: null },
      { artikl_id: 9, naziv: "Arhivirani", cijena_kom: 5, m2_po_komadu: null, unos: "kom", unesena_m2: null, komada: 1, popust_tip: null, popust_vrijednost: null, slika: null },
    ],
  };
  const obloge = new Map([
    [7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 22, m2_po_komadu: 0.448, aktivan: true }],
    [9, { id: 9, naziv: "Arhivirani", slika: null, cijena_kom: 5, m2_po_komadu: null, aktivan: false }],
  ]);

  it("Kopiraj: bez dodataka, popust ostaje, napomena prazna, trenutne cijene, arhivirane preskočene", () => {
    const { stanje, preskocene } = uredivacIzKopije(prodaja, obloge);
    expect(preskocene).toEqual(["Arhivirani"]);
    expect(stanje.napomena).toBe("");
    expect(stanje.kupacIme).toBe("");
    expect(stanje.ugradnja.ukljucena).toBe(false);
    expect(stanje.ljepilo.ukljuceno).toBe(false);
    expect(stanje.prijevoz.ukljucen).toBe(false);
    expect(stanje.popust).toEqual({ tip: "posto", vrijednost: "10" });
    expect(stanje.stavke).toEqual([
      { artiklId: 7, naziv: "WPC hrast", slika: null, cijenaKom: 22, m2PoKomadu: 0.448, unos: "kom", kolicina: "3", popust: { tip: "posto", vrijednost: "" } },
    ]);
  });

  it("podaciZaRpc: 3 kom × 22,00 − 10 % = 59,40, bez kupca i dodataka", () => {
    const s: StanjeUredivaca = { ...uredivacIzKopije(prodaja, obloge).stanje, napomena: "  Gotovina " };
    const snimak = snimakIz(s);
    const { podaci, greske } = procitajUredivac(s, predlozeniM2(s));
    expect(greske).toEqual({});
    const { rezultat } = izracunajPredracun(podaci, snimak, BEZ_PDV);
    expect(podaciZaRpc(podaci, snimak, BEZ_PDV, rezultat, null)).toMatchObject({
      kupac_ime: "",
      napomena: "Gotovina",
      ugradnja_m2: null,
      ugradnja_cijena_m2: null,
      ljepilo_kom: null,
      ljepilo_cijena: null,
      prijevoz: null,
      popust_tip: "posto",
      popust_vrijednost: 10,
      medjuzbroj: 66,
      popust_iznos: 6.6,
      osnovica: 59.4,
      ukupno: 59.4,
      kopija_od: null,
      stavke: [{ artikl_id: 7, unos: "kom", unesena_m2: null, komada: 3, cijena_kom: 22, iznos: 66 }],
    });
  });

  it("manjak iz komada izračuna (m² zaokruženo naviše) i trenutnog stanja", () => {
    const s: StanjeUredivaca = {
      ...prazanUredivac(),
      stavke: [WPC, { ...WPC, artiklId: 8, naziv: "PVC mramor", m2PoKomadu: null, unos: "kom", kolicina: "2", popust: { tip: "posto", vrijednost: "" } }],
    };
    const { podaci } = procitajUredivac(s, 0);
    const { rezultat } = izracunajPredracun(podaci, snimakIz(s), BEZ_PDV);
    const stavke = s.stavke.map((st, i) => ({ artiklId: st.artiklId, naziv: st.naziv, komada: rezultat.stavke[i].komada }));
    expect(stavke.map((x) => x.komada)).toEqual([28, 2]);
    expect(manjak(stavke, new Map([[7, 30], [8, -1]]))).toEqual([
      { artiklId: 8, naziv: "PVC mramor", treba: 2, ima: -1, nedostaje: 2 },
    ]);
  });
});

describe("iznosiSpremljenog", () => {
  it("PRD §6.4: dodaci iz kalkulacije, zbrojevi iz baze", () => {
    const r = iznosiSpremljenog({
      kupac_ime: null,
      kupac_telefon: null,
      kupac_mjesto: null,
      kupac_adresa: null,
      kupac_jib: null,
      svrha: null,
      nacin_placanja: null,
      datum_isporuke: null,
      vrijedi_dana: null,
      napomena: null,
      ugradnja_m2: 12.5,
      ugradnja_cijena_m2: 15,
      ljepilo_kom: 4,
      ljepilo_cijena: 12,
      prijevoz: 25,
      popust_tip: "posto",
      popust_vrijednost: 5,
      stavke: [{ artikl_id: 7, naziv: "WPC", cijena_kom: 22, m2_po_komadu: 0.448, unos: "m2", unesena_m2: 12.5, komada: 28, popust_tip: null, popust_vrijednost: null, slika: null }],
      pdv_u_sustavu: true,
      pdv_cijene_sa_pdv: true,
      pdv_stopa: 17,
      medjuzbroj: 876.5,
      popust_iznos: 43.83,
      osnovica: 711.68,
      pdv_iznos: 120.99,
      ukupno: 832.67,
    });
    expect(r).toEqual({
      stavke: 616,
      popustStavki: 0,
      ugradnja: 187.5,
      ljepilo: 48,
      prijevoz: 25,
      medjuzbroj: 876.5,
      popust: 43.83,
      popustPosto: 5,
      osnovica: 711.68,
      pdv: 120.99,
      pdvStopa: 17,
      uSustavuPdv: true,
      ukupno: 832.67,
    });
  });
});
