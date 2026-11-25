// PDF predračuna po Excel predlošku „Predračun Obloga.ba.xlsx” (Design.md › PDF predračun, A4 uspravno).
// Učitava se samo dinamički iz PdfGumbi (import() na klik), pa @react-pdf ne ulazi u početni JS.
//
// Sve mjere su iz predloška: širine stupaca (px), visine redaka i veličine fonta (pt) množe se istim
// faktorom K kojim Excel pri ispisu sliku lista smješta u širinu A4 („fit to page”).

import type { ReactNode } from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, type Styles } from "@react-pdf/renderer";
import { SLIKE_PDF, type PredracunPdf as Model, type VrstaKontakta } from "@/lib/pdf";

let registrirano = false;

/**
 * Arimo = metrički isti kao Arial, Carlito = kao Calibri (fontovi iz predloška), oba s č, ć, đ, š, ž.
 * Jednom po sesiji; `origin` jer react-pdf u pregledniku dohvaća fontove po apsolutnom URL-u.
 */
export function registrirajFontove(origin: string) {
  if (registrirano) return;
  Font.register({
    family: "Arimo",
    fonts: [
      { src: `${origin}/fonts/Arimo-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Arimo-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Carlito",
    fonts: [
      { src: `${origin}/fonts/Carlito-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Carlito-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Bez rastavljanja riječi na slogove (engleska pravila kvare hrvatske riječi).
  Font.registerHyphenationCallback((rijec) => [rijec]);
  registrirano = true;
}

/* ---------------------------------------------------------------------------
 * Mjere iz predloška
 * ------------------------------------------------------------------------- */

const INC = 72;
const A4 = { sirina: 595.28, visina: 841.89 };
/** Margine stranice iz predloška (inči). */
const RUB = { lijevo: 0.5 * INC, desno: 0.34 * INC, gore: 0.72 * INC, dolje: 0.75 * INC };
/** Širine stupaca A–H u pikselima (Excel širina × 7 px, Calibri 11). */
const STUPCI_PX = [138, 104, 124, 397, 241, 246, 327, 405] as const;
const PX_U_PT = 0.75;
const SIRINA_SADRZAJA = A4.sirina - RUB.lijevo - RUB.desno;
/** Faktor ispisa: list širok STUPCI_PX smanjen u širinu A4 između margina (≈ 0,36). */
const K = SIRINA_SADRZAJA / (STUPCI_PX.reduce((a, b) => a + b, 0) * PX_U_PT);

/** Excel piksel → PDF točka. */
const px = (n: number) => n * PX_U_PT * K;
/** Excel točka (visina retka, veličina fonta) → PDF točka. */
const pt = (n: number) => n * K;

const [A, B, C, D, E, F, G, H] = STUPCI_PX.map(px);

const TAMNOPLAVA = "#1F497D"; // tema dk2 – boja naziva firme
const CRNA = "#000000";
const TANKA = 0.5;
const SREDNJA = 1;
const RAZMAK = px(3); // unutarnji razmak ćelije

/* ---------------------------------------------------------------------------
 * Stilovi
 * ------------------------------------------------------------------------- */

const s = StyleSheet.create({
  stranica: {
    fontFamily: "Arimo",
    fontSize: pt(24),
    color: CRNA,
    paddingTop: RUB.gore,
    paddingBottom: RUB.dolje,
    paddingLeft: RUB.lijevo,
    paddingRight: RUB.desno,
  },
  red: { flexDirection: "row" },
  dolje: { justifyContent: "flex-end" },
  gore: { justifyContent: "flex-start" },
  sredina: { justifyContent: "center" },
  celija: { paddingHorizontal: RAZMAK },
  desno: { textAlign: "right" },
  centar: { textAlign: "center" },

  arial24: { fontFamily: "Arimo", fontSize: pt(24) },
  arial24b: { fontFamily: "Arimo", fontSize: pt(24), fontWeight: 700 },
  arial22: { fontFamily: "Arimo", fontSize: pt(22) },
  arial20: { fontFamily: "Arimo", fontSize: pt(20) },
  calibri24: { fontFamily: "Carlito", fontSize: pt(24) },
  calibri24b: { fontFamily: "Carlito", fontSize: pt(24), fontWeight: 700 },

  logo: { position: "absolute", top: 0, left: A + B + C + D + E + px(153.7), width: px(524.8), height: px(787) },
  kontakt: { flexDirection: "row", justifyContent: "flex-end", alignItems: "flex-end" },

  zaglavljeTablice: { borderTopWidth: TANKA, borderBottomWidth: TANKA, borderColor: CRNA },
  crtaZbroja: { borderBottomWidth: SREDNJA, borderColor: CRNA },
});

/** Ikona uz kontakt: veličina i razmak iz predloška (web je veća ikona). */
const IKONA: Record<VrstaKontakta, { sirina: number; visina: number }> = {
  web: { sirina: px(54.2), visina: px(48.4) },
  instagram: { sirina: px(32.5), visina: px(33.3) },
  whatsapp: { sirina: px(32), visina: px(32.4) },
  viber: { sirina: px(32.9), visina: px(32.9) },
};

/** Visine redaka predloška (pt). */
const VISINA = {
  r1: 46.2,
  r2: 30,
  r5: 27.6,
  r6: 28.8,
  r7: 37.2,
  r8: 44.4,
  podaci: 44.4,
  vrijedi: 44.4,
  r12: 62.4,
  kupac: 35.4,
  adresa: 39,
  jib: 33.6,
  tel: 40.8,
  r17: 40.8,
  zaglavljeTablice: 63,
  stavka: 48,
  zaglavljeUgradnje: 55.8,
  ugradnja: 47.4,
  razmakZbroja: 21,
  zbroj: 52.8,
  r36: 206.4,
  izjava: 101.4,
};

/** Predložak ima 6 redaka za stavke; kraći predračun ih popunjava praznima. */
const NAJMANJE_REDAKA = 6;

/* ---------------------------------------------------------------------------
 * Pomoćne komponente
 * ------------------------------------------------------------------------- */

type Okomito = "gore" | "sredina" | "dolje";

/** Ćelija zadane širine; tekst se poravnava okomito kao u Excelu. */
function Celija({
  sirina,
  okomito = "dolje",
  stil,
  children,
}: {
  sirina: number;
  okomito?: Okomito;
  stil?: Styles[string] | Styles[string][];
  children?: ReactNode;
}) {
  return <View style={[s.celija, s[okomito], { width: sirina }, ...(Array.isArray(stil) ? stil : stil ? [stil] : [])]}>{children}</View>;
}

/** Red fiksne (najmanje) visine iz predloška. */
function Red({ visina, stil, children, wrap = false }: { visina: number; stil?: Styles[string]; children?: ReactNode; wrap?: boolean }) {
  return (
    <View style={[s.red, { minHeight: pt(visina) }, ...(stil ? [stil] : [])]} wrap={wrap}>
      {children}
    </View>
  );
}

function Kontakt({ kontakt, origin }: { kontakt: Model["kontakti"][number] | undefined; origin: string }) {
  if (!kontakt) return null;
  const ikona = IKONA[kontakt.vrsta];
  return (
    <View style={s.kontakt}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image> nema alt */}
      <Image src={`${origin}${SLIKE_PDF[kontakt.vrsta]}`} style={{ width: ikona.sirina, height: ikona.visina, marginRight: px(14) }} />
      <Text style={s.arial24}>{kontakt.tekst}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------------------
 * Dokument
 * ------------------------------------------------------------------------- */

export function PredracunPdf({ model: m, origin }: { model: Model; origin: string }) {
  const lijevo = A + B + C + D + E + F + G; // tekst zaglavlja se prelijeva preko A–G
  const [r2, r3, r4, r5, r6, ...visakRedaka] = m.firma.retci;
  const prazniRetci = Math.max(0, NAJMANJE_REDAKA - m.retci.length);
  const zadnjiZbroj = m.zbroj.length - 1;

  return (
    <Document title={`Predračun ${m.broj}`} author={m.firma.naziv} creator={m.firma.naziv} producer={m.firma.naziv} language="hr">
      <Page size="A4" style={s.stranica}>
        {/* Zaglavlje: retci 1–8 s logom preko F–H */}
        <View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image> nema alt */}
          <Image src={`${origin}${SLIKE_PDF.logo}`} style={s.logo} />

          <Red visina={VISINA.r1}>
            <Celija sirina={lijevo}>
              <Text>
                <Text style={[s.arial24b, { fontSize: pt(30), color: TAMNOPLAVA }]}>{m.firma.naziv}</Text>
                {m.firma.vlasnik && (
                  <>
                    <Text style={[s.arial24, { fontSize: pt(28) }]}> </Text>
                    <Text style={[s.arial24, { fontSize: pt(18) }]}>{m.firma.vlasnik}</Text>
                  </>
                )}
              </Text>
            </Celija>
            <Celija sirina={H}>
              <Kontakt kontakt={m.kontakti[0]} origin={origin} />
            </Celija>
          </Red>
          {[r2, r3, r4].map((redak, i) => (
            <Red key={i} visina={VISINA.r2}>
              <Celija sirina={lijevo}>
                <Text style={s.arial22}>{redak ?? ""}</Text>
              </Celija>
              <Celija sirina={H}>
                <Kontakt kontakt={m.kontakti[i + 1]} origin={origin} />
              </Celija>
            </Red>
          ))}
          <Red visina={VISINA.r5}>
            <Celija sirina={lijevo}>
              <Text style={s.arial22}>{r5 ?? ""}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.r6}>
            <Celija sirina={lijevo}>
              <Text style={s.arial22}>{r6 ?? ""}</Text>
            </Celija>
          </Red>
          {visakRedaka.map((redak) => (
            <Red key={redak} visina={VISINA.r6}>
              <Celija sirina={lijevo}>
                <Text style={s.arial22}>{redak}</Text>
              </Celija>
            </Red>
          ))}
          <Red visina={VISINA.r7 + VISINA.r8 - visakRedaka.length * VISINA.r6} />

          {/* Broj, datum, rok */}
          <Red visina={VISINA.podaci}>
            <Celija sirina={A + B} okomito="gore">
              <Text style={s.arial24b}>Predračun br.:</Text>
            </Celija>
            <Celija sirina={C + D} okomito="gore">
              <Text>{m.broj}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.podaci}>
            <Celija sirina={A} okomito="gore">
              <Text>Datum:</Text>
            </Celija>
            <Celija sirina={B + C + D} okomito="gore">
              <Text>{m.datum}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.vrijedi}>
            <Celija sirina={A} okomito="gore">
              <Text style={s.arial20}>Vrijedi:</Text>
            </Celija>
            <Celija sirina={B + C + D} okomito="gore">
              <Text style={s.arial20}>{m.vrijedi}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.r12} />

          {/* Kupac */}
          {(
            [
              ["Kupac:", m.kupac.ime, VISINA.kupac, true],
              ["Adresa:", m.kupac.adresa, VISINA.adresa, false],
              ["JIB:", m.kupac.jib, VISINA.jib, false],
              ["Tel.:", m.kupac.telefon, VISINA.tel, false],
            ] as const
          ).map(([oznaka, vrijednost, visina, podebljano]) => (
            <Red key={oznaka} visina={visina}>
              <Celija sirina={A} okomito="gore">
                <Text style={podebljano ? s.arial24b : undefined}>{oznaka}</Text>
              </Celija>
              <Celija sirina={B + C + D + E + F} okomito="gore">
                <Text>{vrijednost}</Text>
              </Celija>
            </Red>
          ))}
          <Red visina={VISINA.r17} />
        </View>

        {/* Stavke */}
        <Red visina={VISINA.zaglavljeTablice} stil={s.zaglavljeTablice}>
          <Celija sirina={A + B} okomito="sredina">
            <Text style={s.calibri24b}>Red. Br.</Text>
          </Celija>
          <Celija sirina={C + D} okomito="sredina">
            <Text style={s.calibri24b}>Naziv artikla</Text>
          </Celija>
          <Celija sirina={E} okomito="sredina">
            <Text style={s.arial24b}>Količina/kom</Text>
          </Celija>
          <Celija sirina={F} okomito="sredina" stil={s.desno}>
            <Text style={s.arial24b}>Cijena/ kom</Text>
          </Celija>
          <Celija sirina={G} okomito="sredina" stil={s.desno}>
            <Text style={s.arial24b}>Popust %</Text>
          </Celija>
          <Celija sirina={H} okomito="sredina" stil={s.desno}>
            <Text style={s.arial24b}>Vrijednost:</Text>
          </Celija>
        </Red>
        {m.retci.map((r) => (
          <Red key={r.rb} visina={VISINA.stavka}>
            <Celija sirina={A + B} okomito="sredina">
              <Text style={s.calibri24b}>{r.rb}</Text>
            </Celija>
            <Celija sirina={C + D} okomito="sredina">
              <Text style={s.calibri24}>{r.naziv}</Text>
            </Celija>
            <Celija sirina={E} okomito="sredina" stil={s.centar}>
              <Text>{r.kolicina}</Text>
            </Celija>
            <Celija sirina={F} okomito="sredina">
              <Text>{r.cijena}</Text>
            </Celija>
            <Celija sirina={G} okomito="sredina" stil={s.desno}>
              <Text>{r.popust}</Text>
            </Celija>
            <Celija sirina={H} okomito="sredina" stil={s.desno}>
              <Text>{r.iznos}</Text>
            </Celija>
          </Red>
        ))}
        {Array.from({ length: prazniRetci }, (_, i) => (
          <Red key={`prazno-${i}`} visina={VISINA.stavka} />
        ))}

        {/* Ugradnja (u predlošku skrivena tablica, ovdje samo kad je uključena) */}
        {m.ugradnja && (
          <View wrap={false}>
            <Red visina={VISINA.zaglavljeUgradnje} stil={s.zaglavljeTablice}>
              <Celija sirina={A + B + C + D} okomito="sredina">
                <Text style={s.calibri24b}>Ugradnja:</Text>
              </Celija>
              <Celija sirina={E} okomito="sredina" stil={s.centar}>
                <Text style={s.arial24b}>m2</Text>
              </Celija>
              <Celija sirina={F} okomito="sredina" stil={s.desno}>
                <Text style={s.arial24b}>Cijena/ m2</Text>
              </Celija>
              <Celija sirina={G + H} />
            </Red>
            <Red visina={VISINA.ugradnja}>
              <Celija sirina={A + B} okomito="sredina">
                <Text style={s.calibri24b}>{m.ugradnja.rb}</Text>
              </Celija>
              <Celija sirina={C + D} okomito="sredina">
                <Text style={s.calibri24}>{m.ugradnja.naziv}</Text>
              </Celija>
              <Celija sirina={E} okomito="sredina" stil={s.centar}>
                <Text>{m.ugradnja.m2}</Text>
              </Celija>
              <Celija sirina={F} okomito="sredina">
                <Text>{m.ugradnja.cijenaM2}</Text>
              </Celija>
              <Celija sirina={G} />
              <Celija sirina={H} okomito="sredina" stil={s.desno}>
                <Text>{m.ugradnja.iznos}</Text>
              </Celija>
            </Red>
          </View>
        )}

        {/* Zbroj, uvjeti i izjava o PDV-u */}
        <View wrap={false}>
          <Red visina={VISINA.razmakZbroja * 2} />
          {m.zbroj.map((r, i) => (
            <Red key={r.naziv} visina={VISINA.zbroj}>
              <Celija sirina={A + B + C + D + E} />
              {/* Oznaka se (kao u Excelu) prelijeva ulijevo iz G u F. */}
              <Celija sirina={F + G} okomito="gore" stil={s.desno}>
                <Text style={s.calibri24b}>{r.naziv}</Text>
              </Celija>
              <Celija sirina={H} okomito="gore" stil={s.desno}>
                <Text>{r.iznos}</Text>
              </Celija>
              {/* Srednja crta samo ispod G i H. */}
              {i === zadnjiZbroj && <View style={[s.crtaZbroja, { position: "absolute", bottom: 0, right: 0, width: G + H }]} />}
            </Red>
          ))}
          <Red visina={VISINA.zbroj}>
            <Celija sirina={A + B + C + D + E} />
            <Celija sirina={F + G} stil={s.desno}>
              <Text style={s.calibri24b}>Ukupno za platiti:</Text>
            </Celija>
            <Celija sirina={H} stil={s.desno}>
              <Text>{m.ukupno}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.zbroj} />

          <Red visina={VISINA.zbroj}>
            <Celija sirina={A + B} stil={s.desno}>
              <Text style={s.arial20}>Datum isporuke:</Text>
            </Celija>
            <Celija sirina={C + D + E}>
              <Text style={s.arial20}>{m.datumIsporuke}</Text>
            </Celija>
            <Celija sirina={F + G} stil={s.desno}>
              <Text>Način plaćanja:</Text>
            </Celija>
            <Celija sirina={H}>
              <Text>{m.nacinPlacanja}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.zbroj}>
            <Celija sirina={A + B + C + D + E} />
            <Celija sirina={F + G} stil={s.desno}>
              <Text>Svrha:</Text>
            </Celija>
            <Celija sirina={H}>
              <Text>{m.svrha}</Text>
            </Celija>
          </Red>
          <Red visina={VISINA.zbroj}>
            <Celija sirina={A + B + C + D + E} />
            <Celija sirina={F + G} stil={s.desno}>
              <Text>{m.napomenaPdv}</Text>
            </Celija>
          </Red>

          {m.izjavaPdv && (
            <>
              <Red visina={VISINA.r36} />
              <Red visina={VISINA.izjava}>
                <Celija sirina={SIRINA_SADRZAJA} okomito="sredina" stil={s.centar}>
                  <Text style={s.arial20}>{m.izjavaPdv}</Text>
                </Celija>
              </Red>
            </>
          )}
        </View>

        <Text
          fixed
          style={[s.arial20, { position: "absolute", bottom: RUB.dolje / 2, right: RUB.desno }]}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}
