// PDF predračuna (Design.md › PDF predračun, A4 uspravno).
// Učitava se samo dinamički iz PdfGumbi (import() na klik), pa @react-pdf ne ulazi u početni JS.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { LOGO_PDF, type PredracunPdf as Model } from "@/lib/pdf";

// Neutralne boje dokumenta; brend (app/globals.css @theme) samo u logu, traci i naslovu.
const BOJA = {
  espresso: "#311212",
  tekst: "#1f1f1f",
  sivo: "#6b6b6b",
  crta: "#d9d9d9",
  crtaJaka: "#1f1f1f",
  zaglavljeTablice: "#f2f2f2",
};
const TRAKA = ["#311212", "#553c3c", "#8f6848", "#eeb86b", "#f4991a"];

let registrirano = false;

/**
 * Fontovi s hrvatskim slovima (ugrađeni PDF fontovi nemaju č, ć, đ, š, ž). Statični TTF iz public/fonts.
 * Jednom po sesiji; `origin` jer react-pdf u pregledniku dohvaća fontove po apsolutnom URL-u.
 */
export function registrirajFontove(origin: string) {
  if (registrirano) return;
  Font.register({
    family: "Nunito Sans",
    fonts: [
      { src: `${origin}/fonts/NunitoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/NunitoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Poppins",
    fonts: [
      { src: `${origin}/fonts/Poppins-SemiBold.ttf`, fontWeight: 600 },
      { src: `${origin}/fonts/Poppins-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Bez rastavljanja riječi na slogove (engleska pravila kvare hrvatske riječi).
  Font.registerHyphenationCallback((rijec) => [rijec]);
  registrirano = true;
}

const MM = 72 / 25.4;
const RUB_STRANICE = 16 * MM;

const s = StyleSheet.create({
  stranica: {
    fontFamily: "Nunito Sans",
    fontSize: 10,
    color: BOJA.tekst,
    paddingTop: 12 * MM,
    paddingBottom: 18 * MM,
    paddingHorizontal: RUB_STRANICE,
  },
  traka: { position: "absolute", top: 0, left: 0, right: 0, height: 4, flexDirection: "row" },
  trakaDio: { flex: 1 },

  zaglavlje: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: 22 * MM, width: 22 * MM * (600 / 619) },
  firma: { alignItems: "flex-end", maxWidth: "60%" },
  firmaNaziv: { fontFamily: "Poppins", fontWeight: 600, fontSize: 11, color: BOJA.tekst, marginBottom: 2 },
  firmaRedak: { fontSize: 8.5, color: BOJA.sivo, textAlign: "right", lineHeight: 1.4 },

  naslovRed: {
    marginTop: 10 * MM,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  naslov: { fontFamily: "Poppins", fontWeight: 700, fontSize: 22, color: BOJA.espresso, letterSpacing: 0.5 },
  broj: { textAlign: "right", fontSize: 10, lineHeight: 1.5 },
  podebljano: { fontWeight: 700, color: BOJA.tekst },

  kupac: {
    marginTop: 6 * MM,
    borderWidth: 0.75,
    borderColor: BOJA.crta,
    borderRadius: 4,
    paddingVertical: 3 * MM,
    paddingHorizontal: 4 * MM,
  },
  oznaka: { fontSize: 7.5, color: BOJA.sivo, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  kupacTekst: { fontSize: 10.5 },

  tablica: { marginTop: 6 * MM },
  redZaglavlja: {
    flexDirection: "row",
    backgroundColor: BOJA.zaglavljeTablice,
    borderBottomWidth: 0.75,
    borderBottomColor: BOJA.crta,
    paddingVertical: 5,
  },
  celijaZaglavlja: { fontWeight: 700, fontSize: 8.5, color: BOJA.tekst },
  red: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BOJA.crta, paddingVertical: 6 },
  stRb: { width: "7%", paddingLeft: 6 },
  stOpis: { width: "43%", paddingRight: 8 },
  stKolicina: { width: "18%", textAlign: "right", paddingRight: 8 },
  stCijena: { width: "15%", textAlign: "right", paddingRight: 8 },
  stIznos: { width: "17%", textAlign: "right", paddingRight: 6 },

  sazetak: { marginTop: 5 * MM, marginLeft: "auto", width: "50%" },
  redSazetka: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  sivo: { color: BOJA.sivo },
  ukupno: { marginTop: 2.5 * MM, borderTopWidth: 1, borderTopColor: BOJA.crtaJaka, paddingTop: 2.5 * MM },
  ukupnoTekst: { fontWeight: 700, fontSize: 9, color: BOJA.tekst, textTransform: "uppercase", letterSpacing: 0.8 },
  ukupnoIznos: { fontFamily: "Poppins", fontWeight: 700, fontSize: 16, color: BOJA.tekst, textAlign: "right", marginTop: 1 },

  podnozje: {
    position: "absolute",
    bottom: 8 * MM,
    left: RUB_STRANICE,
    right: RUB_STRANICE,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: BOJA.crta,
    paddingTop: 2 * MM,
    fontSize: 8,
    color: BOJA.sivo,
  },
});

export function PredracunPdf({ model: m, origin }: { model: Model; origin: string }) {
  return (
    <Document title={`Predračun ${m.broj}`} author={m.firma.naziv} creator={m.firma.naziv} producer={m.firma.naziv} language="hr">
      <Page size="A4" style={s.stranica}>
        <View style={s.traka} fixed>
          {TRAKA.map((boja) => (
            <View key={boja} style={[s.trakaDio, { backgroundColor: boja }]} />
          ))}
        </View>

        <View style={s.zaglavlje}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf <Image> nema alt */}
          <Image src={`${origin}${LOGO_PDF}`} style={s.logo} />
          <View style={s.firma}>
            <Text style={s.firmaNaziv}>{m.firma.naziv}</Text>
            {m.firma.retci.map((redak) => (
              <Text key={redak} style={s.firmaRedak}>
                {redak}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.naslovRed}>
          <Text style={s.naslov}>PREDRAČUN</Text>
          <View>
            <Text style={s.broj}>
              br. <Text style={s.podebljano}>{m.broj}</Text>
            </Text>
            <Text style={s.broj}>Datum: {m.datum}</Text>
          </View>
        </View>

        {m.kupac.length > 0 && (
          <View style={s.kupac} wrap={false}>
            <Text style={s.oznaka}>Kupac</Text>
            <Text style={s.kupacTekst}>
              <Text style={s.podebljano}>{m.kupac[0]}</Text>
              {m.kupac.slice(1).map((dio) => ` · ${dio}`).join("")}
            </Text>
          </View>
        )}

        <View style={s.tablica}>
          <View style={s.redZaglavlja}>
            <Text style={[s.celijaZaglavlja, s.stRb]}>R. br.</Text>
            <Text style={[s.celijaZaglavlja, s.stOpis]}>Opis</Text>
            <Text style={[s.celijaZaglavlja, s.stKolicina]}>Količina</Text>
            <Text style={[s.celijaZaglavlja, s.stCijena]}>Cijena</Text>
            <Text style={[s.celijaZaglavlja, s.stIznos]}>Iznos</Text>
          </View>
          {m.retci.map((r) => (
            <View key={r.rb} style={s.red} wrap={false}>
              <Text style={[s.stRb, s.sivo]}>{r.rb}</Text>
              <Text style={s.stOpis}>{r.opis}</Text>
              <Text style={s.stKolicina}>{r.kolicina}</Text>
              <Text style={s.stCijena}>{r.cijena}</Text>
              <Text style={s.stIznos}>{r.iznos}</Text>
            </View>
          ))}
        </View>

        <View style={s.sazetak} wrap={false}>
          {m.sazetak.map((r) => (
            <View key={r.naziv} style={s.redSazetka}>
              <Text style={r.istaknuto ? s.podebljano : s.sivo}>{r.naziv}</Text>
              <Text style={r.istaknuto ? s.podebljano : undefined}>{r.iznos}</Text>
            </View>
          ))}
          <View style={s.ukupno}>
            <Text style={s.ukupnoTekst}>UKUPNO ZA PLATITI</Text>
            <Text style={s.ukupnoIznos}>{m.ukupno}</Text>
          </View>
        </View>

        <View style={s.podnozje} fixed>
          <Text>{m.podnozje}</Text>
          <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} />
        </View>
      </Page>
    </Document>
  );
}
