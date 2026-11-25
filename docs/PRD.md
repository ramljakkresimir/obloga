# PRD – Obloga.ba Poslovanje

> Dokument zahtjeva proizvoda (Product Requirements Document).
> Opisuje **što** aplikacija radi i **zašto**, bez tehničkih detalja i detalja baze. Tehnika je u [Tech.md](Tech.md), baza u [DB.md](DB.md), izgled u [Design.md](Design.md).
> Posljednja izmjena: 18. 11. 2026.

---

## 1. Svrha

Obloga.ba je mala firma iz Žepča koja prodaje dekorativne zidne obloge i panele (WPC, PVC/SPC, akustični paneli, CarbonWood, metalni paneli, zeleni zid). Vlasnici danas stanje robe, predračune i dogovore s kupcima vode „u glavi", na papiru i u porukama.

**Obloga.ba Poslovanje** je interna web aplikacija koja na jednom mjestu, s mobitela, vodi:

1. **stanje obloga** na skladištu (sa slikom i imenom svake obloge),
2. **prodaju**, pri čemu se stanje smanjuje automatski,
3. **predračune** koji se šalju kupcu kao PDF, a nakon kupčevog pristanka jednim klikom skidaju robu sa stanja,
4. **bilješke** o kupcima i dogovorima.

## 2. Ciljevi

- Vlasnik u svakom trenutku zna **koliko čega ima** na stanju.
- Predračun se napravi **za manje od 2 minute** na mobitelu i pošalje kupcu preko Vibera, WhatsAppa ili maila.
- **Nema ručnog računanja**: aplikacija sama pretvara m² u komade i zbraja obloge, ugradnju, ljepilo, prijevoz, popust i PDV.
- **Nema dvostrukog unosa**: potvrđeni predračun sam umanjuje stanje.
- Aplikacija je **jednostavna**: velika dugmad, malo polja, jasni nazivi, izgled u bojama brenda obloga.ba.
- Rad je **besplatan**, na besplatnim planovima servisa.

## 3. Korisnici

| Uloga | Opis |
|---|---|
| **Vlasnik** | 1–3 osobe. Svi imaju **ista prava** i vide sve. |

- Nema javne registracije. Naloge (email + lozinka) kreira administrator.
- Nema uloga ni ograničenja među vlasnicima.
- Kupci **ne koriste** aplikaciju. Oni samo primaju PDF predračun.

## 4. Pojmovi

| Pojam | Značenje |
|---|---|
| **Obloga / artikl** | Jedan proizvod u jednoj boji/dezenu, npr. „WPC panel 16×280 – Svijetli hrast". Svaka boja je zaseban artikl. |
| **Kategorija** | Grupa obloga, kao na obloga.ba: PVC/SPC zidne obloge, Akustični paneli, CarbonWood paneli, Fasadni WPC paneli, Metalni paneli, Zeleni zid. |
| **Stanje** | Broj **komada** na skladištu. Smije biti negativno (prodano, a roba još nije stigla). |
| **m² po komadu** | Površina jednog komada, npr. 16 × 280 cm = 0,448 m². |
| **Minimalno stanje** | Prag ispod kojeg se obloga označava kao „nisko stanje". |
| **Ulaz robe** | Dodavanje komada na stanje kad roba stigne. |
| **Predračun** | Ponuda kupcu s brojem `1-26.`. Postaje prodaja tek kad se **potvrdi**. |
| **Brza prodaja** | Prodaja na licu mjesta, bez predračuna i bez PDF-a. |
| **Dodaci** | Ugradnja, ljepilo i prijevoz. Opcionalne stavke predračuna. |
| **Storno** | Poništavanje potvrđene prodaje. Roba se vraća na stanje. |

## 5. Funkcionalni zahtjevi po modulima

### 5.1 Prijava i sesija

- Prijava s **email adresom i lozinkom**.
- Vlasnik **ostaje prijavljen** i ne mora se prijavljivati svaki put kad otvori aplikaciju.
- Ako aplikaciju **7 dana zaredom** ne otvori na tom uređaju, automatski se odjavljuje i sljedeći put se mora ponovno prijaviti.
- Ručna odjava je u Postavkama i odjavljuje samo taj uređaj.
- Nije moguće napraviti novi nalog iz aplikacije.
- Ako se prijavi nalog koji nije upisan kao vlasnik, odmah se odjavljuje uz poruku „Ovaj nalog nema pristup aplikaciji.".
- Vlasnik može **promijeniti lozinku** u Postavkama (trenutna + nova). Zaboravljenu lozinku resetira administrator.

### 5.2 Početna

Početni ekran daje kratak pregled:

- **Prodaja ovaj mjesec**: ukupan iznos u KM (potvrđeni predračuni + brze prodaje).
- **Otvoreni predračuni**: koliko ih čeka odgovor kupca. Klik vodi na listu.
- **Nisko stanje**: obloge ispod minimuma ili u minusu, s brojem komada.
- **Otvorene bilješke**: zadnjih nekoliko neobavljenih.
- Brze akcije: **Novi predračun**, **Brza prodaja**, **Ulaz robe**.

### 5.3 Obloge (katalog i stanje)

**Lista obloga**
- Kartice, **2 u redu**: velika slika, ime, stanje u komadima (i ≈ m²).
- Filter po kategoriji (čipovi na vrhu) i pretraga po imenu.
- Oznake stanja:
  - **nisko stanje** (stanje ≤ minimalno) dobije upozoravajuću oznaku,
  - **minus** (stanje < 0) dobije crvenu oznaku.

**Dodavanje i uređivanje obloge**
- Polja:
  - slika (fotografiranje mobitelom ili odabir iz galerije),
  - naziv,
  - kategorija,
  - širina i dužina u cm,
  - m² po komadu (izračuna se iz dimenzija i može se ručno promijeniti, npr. za role ili pakete),
  - **cijena po komadu (KM)**,
  - minimalno stanje.
- Cijena po m² se samo **prikazuje** (cijena/kom ÷ m² po komadu).
- Obloga koja se više ne prodaje se **arhivira**. Nestaje iz lista i odabira, a ostaje u povijesti i starim predračunima. Arhivirana obloga se može **vratiti iz arhive**.
- Obloga koja **nikad nije bila u predračunu ni u prodaji** (npr. unesena greškom ili za test) može se **trajno obrisati**, zajedno sa svojim ulazima i slikom. Sve ostale obloge se samo arhiviraju.
- Ako obloga nema m² po komadu (npr. pribor), u predračunu se unosi samo u komadima.

**Detalji obloge**
- Slika, podaci, trenutno stanje, gumb **Dodaj na stanje**.
- **Povijest kretanja**: svaka promjena stanja s datumom, vlasnikom, količinom (+/−) i razlogom (ulaz robe, predračun PR-…, brza prodaja, storno, poništenje).
- Kod svakog **ulaza** u povijesti postoji gumb **Poništi** (za grešku tipa 500 umjesto 50). Poništenje vraća stanje i ostaje vidljivo u povijesti. Jedan ulaz se može poništiti samo jednom.

### 5.4 Ulaz robe (skupni)

- Jedan ekran sa **svim obloga**: sličica, ime, trenutno stanje i polje za količinu.
- Filter po kategoriji i pretraga.
- Vlasnik upiše količinu samo kod obloga koje su stigle i pritisne **jedno „Spremi"**.
- Opcionalna napomena za cijeli ulaz (npr. „Kamion iz Zagreba").
- Nakon spremanja stanje svih tih obloga je odmah ažurirano.

### 5.5 Predračuni

**Kreiranje i uređivanje**
1. **Kupac**: ime, telefon, mjesto. Sve se upisuje ručno, baza kupaca ne postoji.
2. **Stavke**: odabir obloge iz mreže sa slikama, pa unos količine s prekidačem **m² / kom**:
   - u **m²**: aplikacija izračuna potrebne komade (zaokruženo **naviše**, bez rezerve);
   - u **kom**: npr. kupac želi „3 ploče".
   - Uz svaku stavku se prikazuje: komada, m², cijena/kom, iznos.
3. **Dodaci** (svaki ima svoj prekidač i po zadanom je **isključen**):
   - **Ugradnja**: m² (predlaže se zbroj m² stavki, može se promijeniti) × cijena po m², koja se **upisuje ručno** na svakom predračunu.
   - **Ljepilo**: broj komada × cijena (cijena se predlaže iz Postavki). Ljepilo **ne skida** stanje.
   - **Prijevoz**: fiksni iznos u KM, upisuje se ručno.
4. **Popust** (opcionalno): na ukupan iznos, **u % ili u KM**.
5. **Interna napomena** (ne ide na PDF).

**Ukupan iznos se uvijek vidi** na dnu ekrana i mijenja se odmah kod svake promjene.

**Statusi**

| Status | Značenje | Moguće akcije |
|---|---|---|
| **Otvoren** | Napravljen, poslan kupcu, čeka odgovor | Uredi, Preuzmi PDF, Pošalji, Kopiraj, **Potvrdi**, Odbij |
| **Potvrđen** | Kupac pristao, roba skinuta sa stanja, ulazi u prodaju | Preuzmi PDF, Pošalji, Kopiraj, **Storniraj** |
| **Odbijen** | Kupac odustao | Kopiraj |
| **Storniran** | Potvrda poništena, roba vraćena na stanje | Kopiraj |

**Izmjene i kopiranje**
- **Otvoren** predračun se može slobodno uređivati. **Broj ostaje isti** i šalje se novi PDF.
- Potvrđeni predračun se ne uređuje. Ispravlja se storniranjem i kopiranjem.
- **Kopiraj** pravi novi otvoreni predračun s **novim brojem** i istim stavkama i dodacima, po **trenutnim** cijenama obloga, a kupac je prazan. Služi za sličnu ponudu drugom kupcu ili za novu verziju.

**Potvrda**
- Gumb **Potvrdi** skida sa stanja sve komade iz stavki.
- Ako za neku oblogu nema dovoljno komada, aplikacija **upozori** („WPC Svijetli hrast: nedostaje 8 kom"), ali **dozvoli** potvrdu. Stanje tada ide u minus i obloga dobije crvenu oznaku.

**PDF i slanje**
- **Preuzmi PDF** radi i na mobitelu i na računalu.
- **Pošalji** na mobitelu otvara izbornik za dijeljenje (Viber, WhatsApp, mail…) s PDF-om u privitku. Gdje dijeljenje nije podržano, PDF se preuzima.
- Ime datoteke: `Predracun-1-26.pdf`.
- Izgled PDF-a je **Excel predložak vlasnika** („Predračun Obloga.ba.xlsx”), vidi Design.md › PDF predračun. Sadržaj:
  - podaci firme iz Postavki: naziv i vlasnik, adresa, JIB (PDV broj samo u sustavu PDV-a), telefon, transakcijski račun, banka; gore desno web i društvene mreže s ikonama; logo,
  - **Predračun br.**, datum i rok valjanosti (**Vrijedi**: 15 dana),
  - kupac: ime, adresa (adresa + mjesto), JIB, telefon,
  - tablica: Red. Br. · Naziv artikla · Količina/kom · Cijena/ kom · Popust % · Vrijednost (obloge i ljepilo),
  - ugradnja u posebnoj tablici (m² · cijena/m²),
  - zbroj: ukupna cijena materijala, ugradnja, cijena dostave (prijevoz), popust, PDV razrada (ako je firma u sustavu PDV-a), **Ukupno za platiti**,
  - datum isporuke, način plaćanja, svrha, „PDV uračunat u cijene”,
  - izvan sustava PDV-a: „Obveznik nije u sustavu PDV-a prema Zakonu o PDV-u BiH”.
- Uz kupca se na predračunu upisuju i **uvjeti** koji idu na PDF: način plaćanja (zadano „gotovinsko”), vrijedi (zadano 15 dana), datum isporuke i svrha.

**Lista predračuna**
- Filter po statusu (Otvoreni / Potvrđeni / Odbijeni / Stornirani / Svi) i pretraga po kupcu ili broju.
- Svaki red prikazuje broj, kupca, mjesto, datum, iznos i status.

### 5.6 Brza prodaja

- Za kupca koji dođe u radnju i odmah kupi.
- Isti odabir obloga i unos m² / kom kao kod predračuna, plus opcionalni **popust**. Nema kupca, dodataka ni PDF-a.
- **Potvrdi prodaju** odmah skida stanje (uz isto upozorenje na manjak) i ulazi u pregled prodaje.
- Brza prodaja se može **stornirati** (roba se vraća na stanje).

### 5.7 Prodaja (pregled)

- Lista svih **potvrđenih predračuna i brzih prodaja**.
- Filter razdoblja: **ovaj mjesec**, **prošli mjesec**, **od–do**.
- **Zbroj** za odabrano razdoblje na vrhu.
- Red: datum, broj predračuna ili „Brza prodaja", kupac, iznos. Klik otvara detalje.
- Stornirane prodaje se ne ubrajaju u zbroj. Prikazuju se prigušeno i s oznakom „Storniran".

### 5.8 Bilješke

- Polje za brzi unos na vrhu. Primjer: „Kupac iz Sarajeva – želi 2 travertino ploče, javiti se u petak".
- Svaka bilješka ima tekst, datum i oznaku **Obavljeno** (kvačica).
- Neobavljene su na vrhu, obavljene ispod, prigušene.
- Pretraga po tekstu, uređivanje i brisanje.

### 5.9 Postavke

- **Podaci firme** za PDF: naziv, adresa, telefon, email, JIB, PDV broj.
- **PDV**:
  - Firma je u sustavu PDV-a: da / ne.
  - Cijene koje unosim **uključuju** PDV: da / ne.
  - Stopa PDV-a: 17 %.
- **Zadana cijena ljepila** (KM/kom).
- **Kategorije**: dodavanje, preimenovanje, redoslijed. Kategorija se može obrisati samo ako u njoj nema obloga.
- **Instalacija aplikacije**: kratke upute za Android i iPhone.
- **Promjena lozinke.**
- **Odjava.**

## 6. Poslovna pravila

### 6.1 Pretvaranje m² u komade

- `komada = m² ÷ (m² po komadu)`, **zaokruženo naviše** na cijeli komad, bez dodatne rezerve.
- Naplaćuju se **komadi** (`komada × cijena/kom`), ne upisani m².
- Ako je unos u komadima, m² se samo prikazuje informativno (`komada × m² po komadu`).

### 6.2 Redoslijed izračuna

1. Iznos svake stavke = komada × cijena/kom.
2. Uključeni dodaci:
   - ugradnja = m² × cijena/m²,
   - ljepilo = kom × cijena,
   - prijevoz = iznos.
3. **Međuzbroj** = stavke + dodaci.
4. **Popust**: % od međuzbroja ili fiksni iznos u KM. Ne može biti veći od međuzbroja.
5. **Iznos nakon popusta** = međuzbroj − popust.
6. **PDV** prema postavkama (vidi 6.3).
7. Svi iznosi se zaokružuju na **2 decimale** (standardno zaokruživanje).

### 6.3 PDV – tri načina

| Postavka | Što se upisuje | Što piše na predračunu |
|---|---|---|
| Firma **nije** u sustavu PDV-a | Cijene bez PDV-a | Samo ukupno, bez PDV-a |
| U sustavu PDV-a, cijene **uključuju** PDV | Krajnje cijene | Osnovica = iznos ÷ 1,17; PDV 17 % = iznos − osnovica; Ukupno = iznos |
| U sustavu PDV-a, cijene **bez** PDV-a | Neto cijene | Osnovica = iznos; PDV 17 % = osnovica × 0,17; Ukupno = osnovica + PDV |

- Predračun **pamti** PDV postavke iz trenutka kad je napravljen. Kasnija promjena postavki ne mijenja stare predračune.

### 6.4 Izračunat primjer

Obloga **WPC panel 16×280 – Svijetli hrast**: 0,448 m²/kom, **22,00 KM/kom**.

Kupac traži 12,5 m² s ugradnjom, ljepilom i prijevozom, uz 5 % popusta:

| Korak | Izračun | Iznos |
|---|---|---|
| Komada | 12,5 ÷ 0,448 = 27,90, **naviše 28 kom** | |
| Obloge | 28 × 22,00 | 616,00 KM |
| Ugradnja | 12,5 m² × 15,00 KM/m² | 187,50 KM |
| Ljepilo | 4 kom × 12,00 KM | 48,00 KM |
| Prijevoz | fiksno | 25,00 KM |
| **Međuzbroj** | | **876,50 KM** |
| Popust 5 % | 876,50 × 0,05 | −43,83 KM |
| **Iznos nakon popusta** | | **832,67 KM** |

PDV po načinima:
- **Nije u sustavu PDV-a**: Ukupno **832,67 KM**.
- **Cijene uključuju PDV**: Osnovica 711,68 KM + PDV 17 % 120,99 KM = Ukupno **832,67 KM**.
- **Cijene bez PDV-a**: Osnovica 832,67 KM + PDV 17 % 141,55 KM = Ukupno **974,22 KM**.

Nakon **Potvrdi** stanje ove obloge se smanji za **28 kom**. Ljepilo ne utječe na stanje.

### 6.5 Numeriranje

- Predračuni: `N-GG.` kao u Excel predlošku, npr. `23-26.` (23. predračun 2026.). Redni broj kreće od 1 svake godine i nikad se ne ponavlja. Do migracije 0010 format je bio `PR-2026-001`; broj se izvodi iz godine i rednog broja, pa i stari predračuni sada imaju novi zapis.
- Brza prodaja nema broj predračuna.

### 6.6 Cijene i povijest

- Cijena obloge se na stavku predračuna **upisuje u trenutku dodavanja**. Kasnija promjena cijene obloge ne mijenja postojeće predračune.
- Svaka promjena stanja ostaje zapisana u povijesti: tko, kada, koliko i zašto. Povijest se ne može brisati, samo poništiti ulaz. Iznimka je trajno brisanje nikad prodane obloge (§5.3), koje briše i njezine ulaze.

### 6.7 Stanje

- Stanje se vodi u **cijelim komadima**.
- Stanje se mijenja **samo** kroz:
  - ulaz robe (+),
  - potvrdu predračuna (−),
  - brzu prodaju (−),
  - storno (+),
  - poništenje ulaza (−).
- Stanje smije biti negativno.

## 7. Nefunkcionalni zahtjevi

- **Mobitel na prvom mjestu**: optimizirano za ekrane od 360 do 430 px, s navigacijom pri dnu. Na računalu radi u širem rasporedu.
- **Instalacija na početni zaslon** (PWA): ikona obloga.ba, otvara se preko cijelog ekrana kao prava aplikacija. Bez App Storea i Play Storea.
- **Jezik**: hrvatski (aplikacija i PDF). Brojevi s decimalnim zarezom (12,5), valuta **KM** (321,50 KM).
- **Unos brojeva**: prihvaća i zarez i točku. Na mobitelu se otvara numerička tipkovnica.
- **Brzina**: liste se učitavaju unutar ~2 s na mobilnom internetu.
- **Internet**: potreban za rad. Bez interneta se prikazuje poruka „Nema internetske veze".
- **Sigurnost**: svi podaci dostupni su samo prijavljenim vlasnicima. Slike obloga nisu povjerljive.
- **Trošak**: 0 KM mjesečno (besplatni planovi). Ograničenja su opisana u Tech.md.
- **Vremenska zona**: Europe/Sarajevo („ovaj mjesec", datumi na PDF-u).

## 8. Izvan opsega (prva verzija)

Ovo **nije** dio prve verzije, ali se može dodati kasnije:

- ispravka stanja s razlogom (inventura, oštećenje); za greške postoji samo „Poništi ulaz"
- nabavne cijene i izračun zarade
- baza kupaca
- žiro račun, rok važenja, potpis i pečat na PDF-u
- slanje maila iz same aplikacije
- push obavijesti i podsjetnici
- grafovi, detaljni izvještaji, izvoz u Excel/CSV
- rad bez interneta (offline)
- više skladišta ili lokacija
- uloge (radnici s ograničenim pravima)
- fiskalni računi (idu kroz postojeću fiskalnu kasu)

## 9. Što vlasnik treba dostaviti

| Što | Gdje / kako |
|---|---|
| **Logo** (PNG, po mogućnosti prozirna pozadina) | `public/slike/logo/logo.png` |
| **Slike obloga**, jedna po boji | `public/slike/obloge/` (ime datoteke kao obloga, npr. `wpc-svijetli-hrast.jpg`) |
| **Lista obloga** (Excel, Word ili poruka) | Za svaku: naziv, boja, kategorija, širina × dužina (cm), cijena/kom, trenutno stanje, min. stanje (opcionalno), ime slike |
| **JIB** i **PDV status** (u sustavu da/ne, PDV broj) | Za podatke na PDF-u |
| **Email adrese vlasnika** | Za kreiranje naloga |
| **Zadana cijena ljepila** | Za prijedlog u predračunu |

## 10. Popis svih dogovorenih funkcionalnosti (checklista)

> Služi za praćenje da ništa nije zaboravljeno. Broj u zagradi je broj pitanja iz dogovora.

### Prijava i sesija
- [ ] Prijava email + lozinka (2)
- [ ] Nema javne registracije; nalozi se kreiraju ručno (1)
- [ ] 1–3 vlasnika s istim pravima (1)
- [ ] Ostaje prijavljen; automatska odjava nakon **7 dana neaktivnosti** (2)
- [ ] Ručna odjava u Postavkama
- [ ] Promjena lozinke u Postavkama
- [ ] Nalog koji nije vlasnik ne može ući (poruka + odjava)

### Obloge i stanje
- [ ] Svaka boja/dezen je zaseban artikl (5)
- [ ] Prikaz kartica **2 u redu**: slika + ime + stanje (29)
- [ ] Filter po kategoriji i pretraga
- [ ] 6 kategorija kao na obloga.ba, mogu se mijenjati u postavkama (22)
- [ ] Dodavanje i uređivanje obloge: slika, naziv, kategorija, dimenzije, m²/kom, cijena/kom, min. stanje
- [ ] Cijena se unosi **po komadu**; cijena/m² se samo prikazuje (7)
- [ ] Upload slike s mobitela (kamera/galerija) (6)
- [ ] Početne slike iz foldera u projektu (6)
- [ ] Stanje u **komadima** (3)
- [ ] Upozorenje na **nisko stanje** (min. stanje po oblozi) (8)
- [ ] Crvena oznaka za **minus** stanje (13)
- [ ] **Povijest** ulaza i izlaza po oblozi (8)
- [ ] **Skupni ulaz robe**: više obloga odjednom, jedno „Spremi" (23)
- [ ] **Poništi** pogrešan ulaz iz povijesti (24)
- [ ] Arhiviranje obloge umjesto brisanja
- [ ] Trajno brisanje samo nikad prodane obloge (s ulazima i slikom)

### Predračuni
- [ ] Podaci kupca upisuju se ručno (ime, telefon, mjesto), bez baze kupaca (15)
- [ ] Odabir obloge iz mreže sa slikama
- [ ] Unos stavke u **m² ili komadima** (prekidač po stavci) (3)
- [ ] m² → komadi, **zaokruženo naviše**, bez rezerve (12)
- [ ] **Ugradnja**: m² (predloženo) × cijena/m² upisana ručno (10)
- [ ] **Ljepilo**: samo stavka cijene (kom × cijena), ne prati stanje (11)
- [ ] **Prijevoz**: fiksni iznos u KM (9)
- [ ] Ugradnja, ljepilo i prijevoz su **isključeni po zadanom**, uključuju se po potrebi (26)
- [ ] **Popust** na ukupno, u % ili KM (25)
- [ ] PDV podesiv u postavkama (3 načina) (4)
- [ ] Ukupan iznos uvijek vidljiv, izračun uživo
- [ ] Broj `1-26.`, od 1 svake godine (28)
- [ ] Statusi: Otvoren → Potvrđen / Odbijen; Potvrđen → Storniran
- [ ] **Uređivanje** otvorenog predračuna, broj ostaje isti (27)
- [ ] **Kopiraj** predračun (novi broj, trenutne cijene) (27)
- [ ] **Potvrdi** automatski skida stanje (zadatak)
- [ ] Upozorenje na manjak, ali dozvoljena potvrda u minus (13)
- [ ] **Storniraj** vraća robu na stanje (13)
- [ ] Interna napomena (ne ide na PDF)
- [ ] Lista predračuna s filterom statusa i pretragom

### PDF
- [x] PDF predračun po Excel predlošku: logo, podaci firme, broj, datum, kupac, stavke, dodaci, popust, PDV, ukupno (16)
- [x] Ispravna hrvatska slova (č, ć, đ, š, ž)
- [ ] **Pošalji** preko Vibera, WhatsAppa ili maila (dijeljenje s mobitela) (14)
- [ ] **Preuzmi PDF**, i na mobitelu (14)

### Prodaja
- [ ] **Brza prodaja** bez predračuna, s popustom, odmah skida stanje (17)
- [ ] Storno brze prodaje
- [ ] Pregled prodaje: lista s filterom (ovaj mjesec / prošli / od–do) i zbrojem (19)

### Početna
- [ ] Prodaja ovaj mjesec (KM) (19)
- [ ] Broj otvorenih predračuna (19)
- [ ] Obloge s niskim stanjem (19)
- [ ] Otvorene bilješke (19)
- [ ] Brze akcije: Novi predračun, Brza prodaja, Ulaz robe

### Bilješke
- [ ] Tekst + datum (18)
- [ ] Oznaka **Obavljeno** (18)
- [ ] Neobavljene na vrhu, pretraga (18)
- [ ] Uređivanje i brisanje

### Postavke
- [ ] Podaci firme za PDF (naziv, adresa, telefon, email, JIB, PDV broj)
- [ ] PDV prekidači (u sustavu; cijene uključuju PDV) i stopa (4)
- [ ] Zadana cijena ljepila
- [ ] Upravljanje kategorijama (22)
- [x] Upute za instalaciju aplikacije

### Izgled i platforma
- [ ] Mobitel na prvom mjestu, navigacija pri dnu (20)
- [x] Instalacija na početni zaslon (PWA) (zadatak)
- [ ] Boje i stil prema brendu obloga.ba (zadatak)
- [ ] Hrvatski jezik u aplikaciji i na PDF-u (30)
- [ ] Folderi za logo i slike obloga (zadatak)
- [ ] Rad na besplatnim planovima (Supabase + Vercel) (zadatak)

### Početni podaci
- [ ] Unos liste obloga koju dostavlja vlasnik, sa slikama (21)
- [ ] Početne kategorije i podaci firme (22)
