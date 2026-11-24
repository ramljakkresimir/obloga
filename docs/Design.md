# Design – prompt za Claude Design

> Kako koristiti:
> 1. Otvori Claude Design.
> 2. Priloži logo (`public/slike/logo/logo.png` ili https://obloga.ba/wp-content/uploads/2026/01/logo_full_obloga_ba.png) i po želji nekoliko slika obloga.
> 3. Kopiraj cijeli blok ispod i zalijepi ga kao prompt.
>
> Paleta je izmjerena iz piksela loga obloga.ba. Fontovi su isti kao na obloga.ba (Nunito Sans + Poppins).
> Funkcionalnosti su u [PRD.md](PRD.md).

---

````markdown
# Zadatak

Dizajniraj kompletno, visoko-vjerno (high-fidelity) korisničko sučelje za internu mobilnu web aplikaciju (PWA) **„Obloga.ba Poslovanje"**. Sav tekst u sučelju je na **hrvatskom jeziku**.

Isporuči:
1. sve mobilne ekrane iz popisa niže, u okviru **390 × 844** (iPhone 14/15), s donjom navigacijom;
2. tri ekrana i u **desktop** verziji (1440 × 900): Obloge, Novi predračun, Prodaja;
3. izgled **PDF predračuna** (A4, uspravno);
4. **ikonu aplikacije** za početni zaslon (512 × 512, i „maskable" varijantu);
5. stranicu s **komponentama i stilovima** (boje, tipografija, gumbi, polja, oznake, kartice).

# Kontekst

Obloga.ba je mala firma iz Žepča (BiH) koja prodaje dekorativne zidne obloge i panele: WPC, PVC/SPC, akustične panele, CarbonWood, metalne panele i umjetni zeleni zid.

Aplikaciju koriste **samo 1–3 vlasnika**, najčešće **na mobitelu**, u radnji, u skladištu ili kod kupca, često jednom rukom. Nisu tehnički potkovani. Aplikacija mora biti **jednostavna kao kalkulator** i izgledati kao dio brenda obloga.ba.

Što vlasnici rade u aplikaciji:
- vode **stanje obloga** (u komadima), svaka obloga ima **sliku i ime**;
- prave **predračune** za kupce. Unose m² ili komade, a aplikacija sama izračuna komade, ugradnju, ljepilo, prijevoz, popust i PDV. Predračun šalju kao PDF preko Vibera/WhatsAppa;
- **potvrđuju** predračun kad kupac pristane, čime se roba automatski skida sa stanja;
- bilježe **brzu prodaju** u radnji;
- gledaju **pregled prodaje**;
- pišu **bilješke** (npr. „Kupac iz Sarajeva – želi 2 travertino ploče").

# Principi dizajna

- **Jednostavno**: jedna glavna akcija po ekranu, jasno istaknuta. Malo polja i bez skrivenih gesta.
- **Veliko i dodirljivo**: gumbi i polja najmanje **48 px** visine, glavni gumbi 56 px. Tekst tijela 16 px.
- **Slike obloga u prvom planu**: obloge se prepoznaju po izgledu, ne po šiframa.
- **Brojke su važne**: iznosi i stanje veliki, poravnati i lako čitljivi (tabularne brojke).
- **Status bojom I tekstom**: nikad samo bojom (npr. crvena točka + „Minus 8 kom").
- **Toplo, prirodno, premium**: osjećaj drva, kamena i dobro uređenog prostora. Puno zraka, tople neutralne pozadine, bez šarenila.
- **Bez tamnog načina** u prvoj verziji.

# Brend

## Logo

- Stilizirano slovo **M** sastavljeno od okomitih traka u nizu boja: od tamne espresso smeđe, preko smeđe i boje drva, do pijeska, jantara i narančaste. Gore u sredini je mali trokut boje drva.
- Ispod je natpis **„obloga.ba"** crnim, geometrijskim sans fontom.
- U zaglavlju aplikacije koristi samo znak (M), a na prijavi i PDF-u puni logo.

## Paleta (izmjereno iz loga)

| Token | Hex | Upotreba |
|---|---|---|
| espresso | `#311212` | primarni gumbi, aktivne ikone, naslovi, „UKUPNO" traka |
| tamnosmeđa | `#553C3C` | sekundarni naslovi, hover primarnog gumba |
| sivosmeđa | `#7A6966` | sekundarni tekst, oznake polja, neaktivne ikone |
| drvo | `#8F6848` | ukrasni detalji, ikone kategorija |
| pijesak | `#EEB86B` | blage pozadine naglaska (npr. odabrani čip `#FBEBD3`) |
| jantar | `#F1A842` | upozorenje „nisko stanje", status „Otvoren" |
| narančasta | `#F4991A` | **naglasak brenda**: indikator aktivne navigacije, plutajući gumb „+", fokus prsten |
| pozadina | `#FBF8F4` | pozadina aplikacije (topla bijela) |
| površina | `#FFFFFF` | kartice, listovi, polja |
| rub | `#EAE3DA` | rubovi kartica i polja, razdjelnici |
| tekst | `#2A1F1D` | glavni tekst |
| uspjeh | `#2F7D4F` | status „Potvrđen", pozitivna promjena stanja (+50) |
| greška | `#C0392B` | „Minus", greške, storno, negativna promjena (−28) |

**Kontrast**:
- Na narančastoj (`#F4991A`) i jantarnoj **ne koristi bijeli tekst**, nego espresso `#311212`.
- Primarni gumb je **espresso s bijelim tekstom**.
- Sve kombinacije moraju zadovoljiti WCAG AA.

**Motiv**: tanka vodoravna traka (4 px) od pet boja loga, u redoslijedu espresso → smeđa → drvo → pijesak → narančasta. Koristi se štedljivo: vrh ekrana za prijavu, vrh PDF-a, prazna stanja.

## Tipografija

- **Poppins** (600, 700): naslovi ekrana, veliki iznosi, brojke na karticama.
- **Nunito Sans** (400, 600, 700): sav ostali tekst.
- Brojke su **tabularne**, da se iznosi poravnavaju u stupcima.
- Ljestvica:
  - naslov ekrana 24/32 Poppins 600,
  - veliki iznos 32/40 Poppins 700,
  - naslov sekcije 18/26 Poppins 600,
  - tijelo 16/24,
  - sitno 14/20,
  - oznaka 13/18 semibold.

## Oblik i prostor

- Zaobljenje: kartice **16 px**, gumbi i polja **12 px**, čipovi i oznake potpuno zaobljeni.
- Sjene: vrlo blage i tople (npr. `0 1px 2px rgba(49,18,18,.06), 0 4px 12px rgba(49,18,18,.06)`).
- Razmaci po mreži od **4 px**, bočna margina **16 px**, razmak između kartica 12 px.
- Ikone: **Lucide** (obrisne), 24 px, debljina linije 2.

# Navigacija i raspored

## Mobitel (glavni)

- **Zaglavlje** (56 px, površina bijela, donji rub):
  - lijevo znak loga (M, 28 px) i naslov ekrana,
  - desno ikona **Postavke** (zupčanik),
  - na pod-ekranima lijevo strelica „Natrag".
- **Donja navigacija** (64 px + sigurna zona), 5 stavki s ikonom i nazivom:
  1. **Početna** (`house`)
  2. **Obloge** (`layout-grid`)
  3. **Predračuni** (`file-text`)
  4. **Prodaja** (`receipt`)
  5. **Bilješke** (`notebook-pen`)
  - Aktivna stavka: espresso ikona i tekst + narančasta „pilula" iza ikone.
- **Ljepljiva donja traka akcija** (iznad navigacije ili umjesto nje na ekranima za unos): glavni gumb preko cijele širine, npr. „Spremi predračun".
- **Plutajući gumb „+"** (narančasta, espresso ikona) na listama Obloge i Predračuni.

## Desktop (≥ 1024 px)

- Lijeva bočna traka (240 px) umjesto donje navigacije: logo gore, iste stavke.
- Sadržaj širine najviše 1200 px.
- Obloge u mreži od 4–5 stupaca.
- Na uređivaču predračuna sažetak iznosa je u desnom stupcu.

# Komponente

- **Gumb**:
  - primarni (espresso, bijeli tekst),
  - sekundarni (bijeli, espresso rub i tekst),
  - naglasni (narančasta, espresso tekst),
  - opasni (bijeli, crveni tekst i rub; za Storniraj i Odbij),
  - tekstualni.
  - Stanja: zadano, pritisnut, onemogućen, učitavanje (spinner).
- **Polje za unos**:
  - oznaka iznad, polje 48 px, pomoćni tekst ispod,
  - stanje greške (crveni rub + poruka).
- **Brojčano polje**: velike brojke, jedinica kao sufiks unutar polja („KM", „m²", „kom"). Za komade gumbi **− / +** sa strane.
- **Prekidač jedinice „m² | kom"**: segmentirani kontrol s dva dijela.
- **Prekidač (switch)**: za uključivanje dodataka (Ugradnja, Ljepilo, Prijevoz) i postavki PDV-a.
- **Čipovi kategorija**: vodoravno pomični. Odabrani čip ima pijesak pozadinu i espresso tekst.
- **Kartica obloge**:
  - slika 1:1 sa zaobljenim gornjim kutovima,
  - ispod naziv (najviše 2 retka) i stanje: „48 kom · ≈ 21,5 m²",
  - u kutu slike oznaka stanja kad je potrebna.
- **Oznake statusa**:
  - **Otvoren**: jantar pozadina `#FDF1DC`, tekst `#8A5300`
  - **Potvrđen**: zelena pozadina `#E3F1E8`, tekst `#2F7D4F`
  - **Odbijen**: siva pozadina `#EEEAE6`, tekst `#7A6966`
  - **Storniran**: crvena pozadina `#F8E1DE`, tekst `#C0392B`
  - **Nisko stanje**: jantarna točka + „Nisko · 3 kom"
  - **Minus**: crvena točka + „Minus · −8 kom"
- **Donji list (bottom sheet)**: za odabir obloge, potvrde i filtere. Ima ručku na vrhu i zaobljene gornje kutove od 20 px.
- **Ljepljiva traka zbroja**: „Ukupno **832,67 KM**" s mogućnošću razvlačenja u razradu (Međuzbroj, Popust, Osnovica, PDV).
- **Obavijest (toast)**: kratka potvrda iznad navigacije, npr. „Predračun PR-2026-014 je potvrđen. Stanje je ažurirano.".
- **Prazno stanje**: motiv trake od 5 boja, kratka poruka i gumb akcije.
- **Učitavanje**: skeleton blokovi u boji ruba.

# Ekrani (mobitel)

## 1. Prijava
- Pozadina topla bijela. Gore tanka traka boja brenda, puni logo u sredini.
- Naslov „Prijava".
- Polja **Email** i **Lozinka** (s ikonom oka).
- Gumb **„Prijavi se"** (primarni, puna širina).
- Stanje greške: „Pogrešan email ili lozinka."
- Bez registracije i bez „zaboravljena lozinka".

## 2. Početna
- Pozdrav: „Dobar dan, Ivane" i datum „utorak, 18. 11. 2026.".
- Velika kartica: **„Prodaja – studeni 2026."** s iznosom **6.842,50 KM** i usporedbom „12 prodaja".
- Dvije manje kartice u redu:
  - **Otvoreni predračuni: 4**
  - **Nisko stanje: 3**
- Tri **brze akcije** (veliki gumbi s ikonom): **Novi predračun** (primarni), **Brza prodaja**, **Ulaz robe**.
- Sekcija **„Nisko stanje"**: vodoravno pomične male kartice obloga s oznakom (jantar / crveno minus).
- Sekcija **„Bilješke"**: 3 otvorene bilješke s kvačicom i poveznica „Sve bilješke".

## 3. Obloge – lista
- Pretraga („Traži oblogu…").
- Čipovi: **Sve** · PVC/SPC · Akustični · CarbonWood · Fasadni WPC · Metalni · Zeleni zid.
- **Mreža kartica, 2 u redu**: slika, naziv, stanje. Prikaži sve oznake (normalno, nisko, minus, 0 kom).
- Gornji desni kut zaglavlja: gumb **„Ulaz robe"**. Plutajući gumb **„+"** za Novu oblogu.
- Stanja: prazno („Još nema obloga. Dodaj prvu oblogu."), učitavanje (skeleton kartice), bez rezultata pretrage.

## 4. Obloga – detalji
- Velika slika preko cijele širine.
- Naziv, kategorija, dimenzije „16 × 280 cm · 0,448 m²/kom".
- Cijena „22,00 KM/kom · 49,11 KM/m²".
- **Veliko stanje**: „48 kom" (≈ 21,5 m²), uz oznaku ako je nisko ili minus, i min. stanje.
- Gumbi: **„Dodaj na stanje"** (primarni), „Uredi" (sekundarni).
- **Povijest kretanja**: lista s datumom, opisom i promjenom (zeleno +, crveno −):
  - „Ulaz robe · Kamion iz Zagreba · Ivan · **+50**" i tekstualni gumb **„Poništi"**
  - „Predračun PR-2026-013 · Ivana K. · **−28**"
  - „Storno PR-2026-011 · **+12**"
  - poništen ulaz: precrtan, s oznakom „Poništeno"

## 5. Obloga – nova / uredi
- Područje za sliku: veliki pravokutnik s ikonom kamere „Fotografiraj ili odaberi sliku". Kad je slika odabrana, prikaz slike s „Promijeni".
- Polja:
  - Naziv,
  - Kategorija (odabir),
  - Širina (cm) i Dužina (cm) u jednom redu,
  - **m² po komadu**: automatski izračunato „0,448", može se promijeniti,
  - **Cijena po komadu (KM)**, s pomoćnim tekstom „= 49,11 KM/m²",
  - Minimalno stanje (kom).
- Kod uređivanja na dnu: tekstualni gumb „Arhiviraj oblogu".
- Ljepljiv gumb **„Spremi"**.

## 6. Ulaz robe (skupni)
- Naslov „Ulaz robe", pretraga i čipovi kategorija.
- Lista redaka: sličica 48 px, naziv, „Trenutno: 48 kom", desno brojčano polje s − / + (prazno = 0).
- Redak s upisanom količinom je istaknut (pijesak pozadina).
- Polje „Napomena (npr. Kamion iz Zagreba)".
- Ljepljiva traka: **„Spremi ulaz · 3 obloge · +120 kom"**.

## 7. Predračuni – lista
- Čipovi statusa: **Otvoreni** (zadano) · Potvrđeni · Odbijeni · Stornirani · Svi. Pretraga „Kupac ili broj".
- Redak:
  - lijevo „PR-2026-014" (sitno) i **Amir H.** · Sarajevo,
  - desno **832,67 KM** i oznaka statusa,
  - ispod datum „18. 11. 2026.".
- Plutajući gumb **„+"** za Novi predračun.

## 8. Novi predračun / Uredi predračun
Jedan pomični ekran sa sekcijama:

1. **Kupac**: Ime i prezime, Telefon, Mjesto. Sve neobavezno.
2. **Obloge**: kartica za svaku stavku:
   - sličica, naziv, „22,00 KM/kom",
   - prekidač **m² | kom**, veliko brojčano polje (12,5 m²),
   - izračun ispod: **„= 28 kom · 12,54 m² · 616,00 KM"**,
   - ikona za uklanjanje.
   - Gumb **„+ Dodaj oblogu"** otvara **donji list s mrežom obloga** (slike, pretraga, čipovi). Dodir na oblogu je dodaje.
3. **Dodaci**: tri retka sa switchem, po zadanom isključeni. Kad se uključe, otvore se polja:
   - **Ugradnja**: m² (predloženo 12,5) × cijena/m² (KM) → „187,50 KM"
   - **Ljepilo**: kom × cijena (predloženo 12,00 KM) → „48,00 KM"
   - **Prijevoz**: iznos (KM) → „25,00 KM"
4. **Popust**: segment **% | KM** + polje → „−43,83 KM".
5. **Napomena** (interna, „ne ide na PDF").

**Ljepljiva traka**: „Ukupno **832,67 KM**" (dodir otvara razradu) i gumb **„Spremi predračun"**.

Prikaži i varijantu s uključenim PDV-om: Osnovica 711,68 · PDV 17 % 120,99 · Ukupno 832,67.

## 9. Predračun – detalji
- Zaglavlje: **PR-2026-014**, oznaka **Otvoren**, datum.
- Kartica kupca (ime, telefon s ikonom za poziv, mjesto).
- Stavke (sličica, naziv, „28 kom (12,50 m²) × 22,00 = 616,00 KM").
- Dodaci, popust, razrada i veliki **UKUPNO 832,67 KM**.
- Akcije:
  - red gumba **„Pošalji"** (primarni, ikona share) i **„Preuzmi PDF"** (sekundarni);
  - red manjih: **„Uredi"**, **„Kopiraj"**;
  - na dnu **„Potvrdi – kupac prihvatio"** (zeleni naglasak ili primarni) i **„Odbij"** (opasni tekstualni).
- **Donji list potvrde s upozorenjem o manjku**:
  - „Nema dovoljno na stanju",
  - „WPC Zlatni hrast – treba 28, ima 20, **nedostaje 8 kom**",
  - „Stanje će otići u minus.",
  - gumbi „Svejedno potvrdi" i „Odustani".
- Varijante ekrana po statusu:
  - **Potvrđen**: zelena oznaka, „Potvrđen 18. 11. 2026.", gumbi Pošalji / Preuzmi / Kopiraj i **„Storniraj"** (opasni);
  - **Odbijen**: samo Kopiraj;
  - **Storniran**: crvena oznaka, samo Kopiraj.

## 10. Brza prodaja
- Isti uređivač stavki kao kod predračuna (m² | kom), plus popust. Bez kupca, dodataka i PDF-a.
- Ljepljiva traka: **„Potvrdi prodaju · 66,00 KM"**.
- Isti donji list upozorenja za manjak.

## 11. Prodaja – pregled
- Segment razdoblja: **Ovaj mjesec** · Prošli mjesec · Od–do (otvara odabir datuma).
- Velika kartica zbroja: „Studeni 2026. · **6.842,50 KM** · 12 prodaja".
- Lista:
  - datum,
  - „PR-2026-013 · Ivana K." ili „Brza prodaja",
  - iznos desno.
  - Stornirane prodaje prigušene, precrtan iznos i oznaka „Storniran".
- Plutajući gumb ili gumb u zaglavlju: **„Brza prodaja"**.

## 12. Bilješke
- Na vrhu polje „Nova bilješka…" s gumbom **„Dodaj"**.
- Pretraga.
- Lista otvorenih: okrugla kvačica, tekst (do 3 retka), datum „18. 11.".
- Sklopiva sekcija **„Obavljeno (5)"**: kvačica ispunjena, tekst prigušen i precrtan.
- Dug pritisak ili ikona „⋯" daje Uredi / Obriši.

## 13. Postavke
Grupirane kartice:
- **Podaci firme**: naziv, adresa, mjesto, telefon, email, JIB, PDV broj.
- **PDV**: switch „Firma je u sustavu PDV-a", switch „Unesene cijene uključuju PDV", polje „Stopa PDV-a (%) 17".
- **Ljepilo**: „Zadana cijena ljepila (KM/kom)".
- **Kategorije**: lista s ručkom za premještanje i olovkom za uređivanje, „+ Dodaj kategoriju".
- **Instalacija aplikacije**: kratki koraci za Android („⋮ → Instaliraj aplikaciju") i iPhone („Dijeli → Dodaj na početni zaslon").
- **Odjava** (opasni tekstualni gumb).
- Dno: „Prijavljen kao vlasnik@obloga.ba" i verzija.

## 14. Dodatno
- **Traka za iPhone instalaciju** (prikazuje se na vrhu Početne): „Instaliraj aplikaciju: dodirni Dijeli, pa Dodaj na početni zaslon", uz ✕ za zatvaranje.
- **Bez interneta**: cijeli ekran s motivom trake, „Nema internetske veze. Provjeri vezu i pokušaj ponovno." i gumb „Pokušaj ponovno".
- **Obavijesti (toast)**: uspjeh („Spremljeno"), greška („Nešto nije u redu. Pokušaj ponovno.").

# PDF predračun (A4, uspravno)

- **Vrh**: tanka traka od 5 boja loga preko cijele širine.
- **Zaglavlje**: lijevo puni logo (visine ~22 mm); desno podaci firme, sitno:
  - Obloga.ba,
  - Sarajevska b.b., 72230 Žepče,
  - +387 63 766 063 · info@obloga.ba,
  - JIB: 4200000000000,
  - PDV broj (samo ako je u sustavu PDV-a).
- **Naslov**: „PREDRAČUN" (Poppins 700, espresso) i desno „br. **PR-2026-014**" i „Datum: 18. 11. 2026.".
- **Boje**: brend samo u logu, traci na vrhu i naslovu „PREDRAČUN". Sav ostali tekst i crte su neutralni (crni / sivi), da dokument izgleda mirno i profesionalno.
- **Kupac** (okvir s tankim sivim rubom): Amir H. · 061 123 456 · Sarajevo.
- **Tablica stavki**: zaglavlje sa svijetlosivom pozadinom, retci s tankim sivim razdjelnicima, iznosi nepodebljani. Stupci: **R. br. · Opis · Količina · Cijena · Iznos**. Primjer:
  - 1 · WPC panel 16×280 – Svijetli hrast · 28 kom (12,50 m²) · 22,00 KM · 616,00 KM
  - 2 · Ugradnja · 12,50 m² · 15,00 KM · 187,50 KM
  - 3 · Ljepilo · 4 kom · 12,00 KM · 48,00 KM
  - 4 · Prijevoz · 1 · 25,00 KM · 25,00 KM
- **Sažetak desno**:
  - Međuzbroj 876,50 KM,
  - Popust 5 % −43,83 KM,
  - (Osnovica / PDV 17 % ako je u sustavu PDV-a),
  - **UKUPNO ZA PLATITI**: tanka tamna crta iznad, oznaka verzalom, a ispod nje iznos **832,67 KM** (Poppins 700, veći, poravnat desno). Bez pozadine i okvira.
- **Podnožje**: jedan redak „obloga.ba · +387 63 766 063 · info@obloga.ba".
- Bez potpisa, pečata, žiro računa i roka važenja. Sve treba ostati na jednoj stranici za tipičan predračun.

# Ikona aplikacije

- Znak loga (M od traka) centriran na toploj bijeloj pozadini `#FBF8F4`.
- Druga varijanta je znak na espresso pozadini.
- „Maskable" varijanta drži znak unutar sigurne zone od 80 %.
- Bez teksta.

# Primjeri podataka (koristi ih u svim ekranima)

**Obloge**:

| Naziv | Dimenzije | Cijena | Stanje |
|---|---|---|---|
| WPC panel 16×280 – Svijetli hrast | 0,448 m² | 22,00 KM | 48 kom |
| WPC panel 16×280 – Zlatni hrast | | 22,00 KM | **3 kom (nisko)** |
| WPC panel 16×280 – Američki orah | | 22,00 KM | 30 kom |
| WPC panel 16×280 – Sivi hrast | | 22,00 KM | **−8 kom (minus)** |
| Akustični panel 60×240 – Hrast natur | | 89,00 KM | 12 kom |
| Akustični panel 60×240 – Crni orah | | | **0 kom** |
| CarbonWood 122×280 – Mramor bijeli | | 145,00 KM | 15 kom |
| SPC ploča 60×120 – Travertino | | 38,00 KM | 20 kom |
| Metalni panel 120×240 – Zlatni ripple | | 120,00 KM | 6 kom |
| Zeleni zid 100×100 – Umjetna trava | | 25,00 KM | 40 kom |

Za slike obloga koristi realistične fotografije tekstura drva, kamena, mramora i zelenila. Bez generičkih ikona.

**Predračuni**:

| Broj | Kupac | Mjesto | Iznos | Status |
|---|---|---|---|---|
| PR-2026-014 | Amir H. | Sarajevo | 832,67 KM | Otvoren |
| PR-2026-013 | Ivana K. | Žepče | 1.245,00 KM | Potvrđen |
| PR-2026-012 | Marko P. | Zenica | 410,40 KM | Odbijen |
| PR-2026-011 | Selma M. | Tuzla | 2.130,00 KM | Storniran |

**Bilješke**:
- „Kupac iz Sarajeva – želi 2 travertino ploče, javiti se u petak"
- „Nazvati dobavljača za WPC Sivi hrast"
- „Ivana K. – ugradnja u srijedu u 9 h" (obavljeno)

**Format**:
- iznosi: `1.234,50 KM`,
- površina: `12,5 m²`,
- datumi: `18. 11. 2026.`,
- decimalni zarez.

# Ton teksta

- Kratko, jasno, prijateljski. Glagoli na gumbima: Spremi, Dodaj, Pošalji, Preuzmi PDF, Potvrdi, Odbij, Storniraj, Uredi, Kopiraj, Poništi, Odjava.
- Poruke o greškama kažu što se dogodilo i što učiniti, npr. „Predračun se može urediti samo dok je otvoren."
- Bez tehničkog žargona.

# Pristupačnost

- Kontrast teksta najmanje WCAG AA. Dodirne površine najmanje 48 × 48 px.
- Vidljivo stanje fokusa: narančasti prsten od 2 px.
- Svako polje ima oznaku, ne samo placeholder.
- Statusi uvijek imaju tekst, ne samo boju.
````
