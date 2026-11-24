import { describe, expect, it } from "vitest";
import {
  iznosiSpremljenog,
  izracunajPredracun,
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
        { ...WPC, artiklId: 8, unos: "kom", kolicina: "2,5" },
        { ...WPC, artiklId: 9, m2PoKomadu: null, unos: "m2", kolicina: "3" },
        { ...WPC, artiklId: 10, unos: "kom", kolicina: "4" },
      ],
      ugradnja: { ukljucena: true, m2: "", rucno: true, cijenaM2: "" },
      ljepilo: { ukljuceno: true, kom: "0", cijena: "-1" },
      prijevoz: { ukljucen: true, iznos: "" },
      popust: { tip: "posto", vrijednost: "120" },
      kupacIme: "x".repeat(121),
    };
    const { podaci, greske } = procitajUredivac(s, 0);
    expect(podaci.stavke).toEqual([{ artiklId: 10, unos: "kom", kolicina: 4 }]);
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
    napomena: "Javiti se u petak",
    ugradnja_m2: 12.5,
    ugradnja_cijena_m2: 15,
    ljepilo_kom: 4,
    ljepilo_cijena: 12,
    prijevoz: 1250.5,
    popust_tip: "km",
    popust_vrijednost: 40,
    stavke: [
      { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 22, m2_po_komadu: 0.448, unos: "m2", unesena_m2: 12.5, komada: 28, slika: null },
      { artikl_id: 8, naziv: "Stari panel", cijena_kom: 10, m2_po_komadu: null, unos: "kom", unesena_m2: null, komada: 3, slika: "/x.jpg" },
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
      { artiklId: 7, naziv: "WPC hrast", slika: null, cijenaKom: 24.5, m2PoKomadu: 0.448, unos: "m2", kolicina: "12,5" },
    ]);
    expect(stanje.ljepilo).toEqual({ ukljuceno: true, kom: "4", cijena: "12" });
  });

  it("uredivacIzKopije: obloga koja više nema m²/kom prelazi na komade", () => {
    const obloge = new Map([[7, { id: 7, naziv: "WPC hrast", slika: null, cijena_kom: 22, m2_po_komadu: null, aktivan: true }]]);
    const { stanje } = uredivacIzKopije({ ...spremljeni, stavke: [spremljeni.stavke[0]] }, obloge);
    expect(stanje.stavke[0]).toMatchObject({ unos: "kom", kolicina: "28" });
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
    napomena: "Platio gotovinom",
    ugradnja_m2: null,
    ugradnja_cijena_m2: null,
    ljepilo_kom: null,
    ljepilo_cijena: null,
    prijevoz: null,
    popust_tip: "posto",
    popust_vrijednost: 10,
    stavke: [
      { artikl_id: 7, naziv: "WPC hrast", cijena_kom: 20, m2_po_komadu: 0.448, unos: "kom", unesena_m2: null, komada: 3, slika: null },
      { artikl_id: 9, naziv: "Arhivirani", cijena_kom: 5, m2_po_komadu: null, unos: "kom", unesena_m2: null, komada: 1, slika: null },
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
      { artiklId: 7, naziv: "WPC hrast", slika: null, cijenaKom: 22, m2PoKomadu: 0.448, unos: "kom", kolicina: "3" },
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
      stavke: [WPC, { ...WPC, artiklId: 8, naziv: "PVC mramor", m2PoKomadu: null, unos: "kom", kolicina: "2" }],
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
      napomena: null,
      ugradnja_m2: 12.5,
      ugradnja_cijena_m2: 15,
      ljepilo_kom: 4,
      ljepilo_cijena: 12,
      prijevoz: 25,
      popust_tip: "posto",
      popust_vrijednost: 5,
      stavke: [{ artikl_id: 7, naziv: "WPC", cijena_kom: 22, m2_po_komadu: 0.448, unos: "m2", unesena_m2: 12.5, komada: 28, slika: null }],
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
