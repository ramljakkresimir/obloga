import { describe, expect, it } from "vitest";
import { brojSImenicom, formatDatum, formatDatumKratko, formatDatumPdf, formatKM, formatM2, OBLIK_DAN, OBLIK_PRODAJA, parseBroj } from "./format";

describe("formatKM", () => {
  it("formatira tisućice i dvije decimale", () => {
    expect(formatKM(1234.5)).toBe("1.234,50 KM");
    expect(formatKM(832.67)).toBe("832,67 KM");
    expect(formatKM(1245)).toBe("1.245,00 KM");
    expect(formatKM(1234567.891)).toBe("1.234.567,89 KM");
  });

  it("nula i negativni", () => {
    expect(formatKM(0)).toBe("0,00 KM");
    expect(formatKM(-0)).toBe("0,00 KM");
    expect(formatKM(-0.001)).toBe("0,00 KM");
    expect(formatKM(-43.83)).toBe("−43,83 KM");
  });

  it("zaokružuje na dvije decimale", () => {
    expect(formatKM(0.125)).toBe("0,13 KM");
    expect(formatKM(19.999)).toBe("20,00 KM");
  });
});

describe("formatM2", () => {
  it("bez suvišnih nula, najviše dvije decimale", () => {
    expect(formatM2(12.5)).toBe("12,5 m²");
    expect(formatM2(12)).toBe("12 m²");
    expect(formatM2(21.504)).toBe("21,5 m²");
    expect(formatM2(12.544)).toBe("12,54 m²");
    expect(formatM2(0.448)).toBe("0,45 m²");
    expect(formatM2(1250)).toBe("1.250 m²");
    expect(formatM2(0)).toBe("0 m²");
  });
});

describe("parseBroj", () => {
  it.each([
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["12", 12],
    [" 3 ", 3],
    ["1.234,50", 1234.5],
    ["1,234.5", 1234.5],
    ["1 234,50", 1234.5],
    ["1 234,50", 1234.5],
    ["1.234.567,8", 1234567.8],
    ["1,2,3", 12.3],
    ["-4", -4],
    ["−4,5", -4.5],
    ["0,5", 0.5],
    [",5", 0.5],
    ["5,", 5],
    ["0", 0],
  ])("%j → %d", (ulaz, ocekivano) => {
    expect(parseBroj(ulaz)).toBe(ocekivano);
  });

  it.each([[""], ["   "], ["abc"], ["12a"], ["1e3"], ["--4"], ["4-"], [","], ["Infinity"]])(
    "%j → null",
    (ulaz) => {
      expect(parseBroj(ulaz)).toBeNull();
    },
  );

  it("null i undefined → null", () => {
    expect(parseBroj(null)).toBeNull();
    expect(parseBroj(undefined)).toBeNull();
  });
});

describe("datumi (Europe/Sarajevo)", () => {
  it("osnovni prikaz", () => {
    expect(formatDatum("2026-11-18T10:00:00Z")).toBe("18. 11. 2026.");
    expect(formatDatum(new Date("2026-01-05T12:00:00Z"))).toBe("5. 1. 2026.");
    expect(formatDatumKratko("2026-11-18T10:00:00Z")).toBe("18. 11.");
  });

  it("PDF predračuna: vodeće nule, bez razmaka (kao Excel predložak)", () => {
    expect(formatDatumPdf("2026-10-08T10:00:00Z")).toBe("08.10.2026.");
    expect(formatDatumPdf("2026-11-17T23:30:00Z")).toBe("18.11.2026.");
    // Datum bez vremena (datum_isporuke) ostaje isti dan.
    expect(formatDatumPdf("2026-12-01")).toBe("01.12.2026.");
  });

  it("dani", () => {
    expect(brojSImenicom(1, OBLIK_DAN)).toBe("1 dan");
    expect(brojSImenicom(15, OBLIK_DAN)).toBe("15 dana");
    expect(brojSImenicom(21, OBLIK_DAN)).toBe("21 dan");
  });

  it("koristi lokalnu zonu, ne UTC, oko ponoći", () => {
    // Zimsko vrijeme (UTC+1): 23:30 UTC je već sljedeći dan u Sarajevu.
    expect(formatDatum("2026-11-17T23:30:00Z")).toBe("18. 11. 2026.");
    expect(formatDatum("2026-11-17T22:59:00Z")).toBe("17. 11. 2026.");
    // Ljetno vrijeme (UTC+2): 22:30 UTC je već sljedeći dan.
    expect(formatDatum("2026-07-14T22:30:00Z")).toBe("15. 7. 2026.");
    expect(formatDatum("2026-07-14T21:59:00Z")).toBe("14. 7. 2026.");
  });

  it("prijelaz ljetnog vremena", () => {
    // 29. 3. 2026. u 01:00 UTC sat ide s 02:00 na 03:00 po lokalnom.
    expect(formatDatum("2026-03-28T23:30:00Z")).toBe("29. 3. 2026.");
    // 25. 10. 2026. u 01:00 UTC sat ide s 03:00 na 02:00 po lokalnom.
    expect(formatDatum("2026-10-25T22:30:00Z")).toBe("25. 10. 2026.");
    expect(formatDatum("2026-10-25T23:00:00Z")).toBe("26. 10. 2026.");
  });

  it("prihvaća timestamptz iz Postgresa", () => {
    expect(formatDatum("2026-11-18 10:00:00+00")).toBe("18. 11. 2026.");
  });
});

describe("brojSImenicom", () => {
  const obloga = ["obloga", "obloge", "obloga"] as const;
  it("hrvatski oblici", () => {
    expect(brojSImenicom(0, obloga)).toBe("0 obloga");
    expect(brojSImenicom(1, obloga)).toBe("1 obloga");
    expect(brojSImenicom(3, obloga)).toBe("3 obloge");
    expect(brojSImenicom(5, obloga)).toBe("5 obloga");
    expect(brojSImenicom(11, obloga)).toBe("11 obloga");
    expect(brojSImenicom(12, obloga)).toBe("12 obloga");
    expect(brojSImenicom(21, obloga)).toBe("21 obloga");
    expect(brojSImenicom(22, obloga)).toBe("22 obloge");
    expect(brojSImenicom(114, ["komad", "komada", "komada"])).toBe("114 komada");
  });

  it("prodaje", () => {
    expect(brojSImenicom(1, OBLIK_PRODAJA)).toBe("1 prodaja");
    expect(brojSImenicom(3, OBLIK_PRODAJA)).toBe("3 prodaje");
    expect(brojSImenicom(12, OBLIK_PRODAJA)).toBe("12 prodaja");
  });
});
