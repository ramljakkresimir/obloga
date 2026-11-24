import { describe, expect, it } from "vitest";
import { graniceUtc, naslovRazdoblja, parametriRazdoblja, razdobljeIzParametara } from "./razdoblje";

const sada = new Date("2026-11-24T10:00:00Z");

describe("razdobljeIzParametara", () => {
  it("bez parametara → ovaj mjesec", () => {
    expect(razdobljeIzParametara({}, sada)).toEqual({ vrsta: "ovaj", od: "2026-11-01", do: "2026-11-30" });
  });

  it("prošli mjesec", () => {
    expect(razdobljeIzParametara({ r: "prosli" }, sada)).toEqual({ vrsta: "prosli", od: "2026-10-01", do: "2026-10-31" });
  });

  it("prošli mjesec preko granice godine", () => {
    expect(razdobljeIzParametara({ r: "prosli" }, new Date("2026-01-15T10:00:00Z"))).toEqual({
      vrsta: "prosli",
      od: "2025-12-01",
      do: "2025-12-31",
    });
  });

  it("veljača prijestupne godine", () => {
    expect(razdobljeIzParametara({}, new Date("2028-02-10T10:00:00Z"))).toMatchObject({ od: "2028-02-01", do: "2028-02-29" });
  });

  it("mjesec se određuje u zoni Sarajeva, ne u UTC-u", () => {
    // 30. 11. 23:30 UTC = 1. 12. 00:30 u Sarajevu
    expect(razdobljeIzParametara({}, new Date("2026-11-30T23:30:00Z"))).toMatchObject({ od: "2026-12-01", do: "2026-12-31" });
  });

  it("ispravan raspon", () => {
    expect(razdobljeIzParametara({ r: "raspon", od: "2026-11-01", do: "2026-11-15" }, sada)).toEqual({
      vrsta: "raspon",
      od: "2026-11-01",
      do: "2026-11-15",
    });
    expect(razdobljeIzParametara({ r: "raspon", od: "2026-11-05", do: "2026-11-05" }, sada)).toMatchObject({
      vrsta: "raspon",
    });
  });

  it("neispravno → ovaj mjesec", () => {
    const ovaj = { vrsta: "ovaj", od: "2026-11-01", do: "2026-11-30" };
    expect(razdobljeIzParametara({ r: "raspon", od: "2026-11-15", do: "2026-11-01" }, sada)).toEqual(ovaj);
    expect(razdobljeIzParametara({ r: "raspon", od: "2026-02-30", do: "2026-03-01" }, sada)).toEqual(ovaj);
    expect(razdobljeIzParametara({ r: "raspon", od: "1.11.2026", do: "2026-11-15" }, sada)).toEqual(ovaj);
    expect(razdobljeIzParametara({ r: "raspon", od: "2026-11-01" }, sada)).toEqual(ovaj);
    expect(razdobljeIzParametara({ r: ["raspon"], od: "2026-11-01", do: "2026-11-02" }, sada)).toEqual(ovaj);
    expect(razdobljeIzParametara({ r: "nesto" }, sada)).toEqual(ovaj);
  });
});

describe("parametriRazdoblja", () => {
  it("zadano razdoblje nema parametara", () => {
    expect(parametriRazdoblja({ vrsta: "ovaj", od: "2026-11-01", do: "2026-11-30" }).toString()).toBe("");
  });

  it("povratno putovanje kroz URL", () => {
    for (const r of [
      { vrsta: "prosli", od: "2026-10-01", do: "2026-10-31" },
      { vrsta: "raspon", od: "2026-03-02", do: "2026-04-15" },
    ] as const) {
      const params = Object.fromEntries(parametriRazdoblja(r));
      expect(razdobljeIzParametara(params, sada)).toEqual(r);
    }
  });
});

describe("graniceUtc", () => {
  it("zimsko vrijeme (+01)", () => {
    expect(graniceUtc({ od: "2026-11-01", do: "2026-11-30" })).toEqual({
      odIso: "2026-10-31T23:00:00.000Z",
      doIso: "2026-11-30T23:00:00.000Z",
    });
  });

  it("ožujak: prelazak na ljetno vrijeme (+01 → +02)", () => {
    expect(graniceUtc({ od: "2026-03-01", do: "2026-03-31" })).toEqual({
      odIso: "2026-02-28T23:00:00.000Z",
      doIso: "2026-03-31T22:00:00.000Z",
    });
  });

  it("listopad: povratak na zimsko vrijeme (+02 → +01)", () => {
    expect(graniceUtc({ od: "2026-10-01", do: "2026-10-31" })).toEqual({
      odIso: "2026-09-30T22:00:00.000Z",
      doIso: "2026-10-31T23:00:00.000Z",
    });
  });

  it("jedan dan na dan promjene vremena ima 23 sata", () => {
    expect(graniceUtc({ od: "2026-03-29", do: "2026-03-29" })).toEqual({
      odIso: "2026-03-28T23:00:00.000Z",
      doIso: "2026-03-29T22:00:00.000Z",
    });
  });

  it("kraj godine", () => {
    expect(graniceUtc({ od: "2026-12-01", do: "2026-12-31" }).doIso).toBe("2026-12-31T23:00:00.000Z");
  });

  it("neispravan datum baca grešku", () => {
    expect(() => graniceUtc({ od: "2026-13-01", do: "2026-12-31" })).toThrow();
  });
});

describe("naslovRazdoblja", () => {
  it("mjesec", () => {
    expect(naslovRazdoblja({ vrsta: "ovaj", od: "2026-11-01", do: "2026-11-30" })).toBe("Studeni 2026.");
    expect(naslovRazdoblja({ vrsta: "prosli", od: "2026-01-01", do: "2026-01-31" })).toBe("Siječanj 2026.");
  });

  it("raspon bez vodećih nula", () => {
    expect(naslovRazdoblja({ vrsta: "raspon", od: "2026-11-01", do: "2026-11-15" })).toBe("1. 11. 2026. – 15. 11. 2026.");
    expect(naslovRazdoblja({ vrsta: "raspon", od: "2026-01-05", do: "2026-01-05" })).toBe("5. 1. 2026.");
  });
});
