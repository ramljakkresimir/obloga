-- 0002_artikli_predracuni (primijenjeno preko MCP-a, verzija 20261118180306)

-- Artikli (obloge)
create table public.artikli (
  id            bigint generated always as identity primary key,
  kategorija_id bigint not null references public.kategorije (id) on delete restrict,
  naziv         text not null check (length(trim(naziv)) > 0),
  slika         text,
  sirina_cm     numeric(8,2) check (sirina_cm > 0),
  duzina_cm     numeric(8,2) check (duzina_cm > 0),
  m2_po_komadu  numeric(10,4) check (m2_po_komadu > 0),
  cijena_kom    numeric(10,2) not null check (cijena_kom >= 0),
  stanje        integer not null default 0,
  min_stanje    integer not null default 0 check (min_stanje >= 0),
  aktivan       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index artikli_kategorija_id_idx on public.artikli (kategorija_id);
create unique index artikli_naziv_aktivan_uk on public.artikli (lower(naziv)) where aktivan;

-- Brojac predracuna po godini
create table public.brojaci (
  godina smallint primary key,
  zadnji integer not null default 0
);

-- Predracuni i brze prodaje
create table public.predracuni (
  id                 bigint generated always as identity primary key,
  vrsta              public.vrsta_prodaje not null default 'predracun',
  godina             smallint,
  redni_broj         integer,
  broj               text generated always as (
                       case when redni_broj is null then null
                            else 'PR-' || godina::text || '-' ||
                                 case when redni_broj < 1000 then lpad(redni_broj::text, 3, '0')
                                      else redni_broj::text end
                       end) stored,
  status             public.status_predracuna not null default 'otvoren',

  kupac_ime          text,
  kupac_telefon      text,
  kupac_mjesto       text,
  napomena           text,

  ugradnja_m2        numeric(10,2) check (ugradnja_m2 > 0),
  ugradnja_cijena_m2 numeric(10,2) check (ugradnja_cijena_m2 >= 0),
  ljepilo_kom        integer       check (ljepilo_kom > 0),
  ljepilo_cijena     numeric(10,2) check (ljepilo_cijena >= 0),
  prijevoz           numeric(10,2) check (prijevoz >= 0),

  popust_tip         public.tip_popusta,
  popust_vrijednost  numeric(10,2) check (popust_vrijednost >= 0),

  pdv_u_sustavu      boolean not null,
  pdv_cijene_sa_pdv  boolean not null,
  pdv_stopa          numeric(5,2) not null,

  medjuzbroj         numeric(12,2) not null,
  popust_iznos       numeric(12,2) not null default 0,
  osnovica           numeric(12,2) not null,
  pdv_iznos          numeric(12,2) not null default 0,
  ukupno             numeric(12,2) not null,

  kopija_od          bigint references public.predracuni (id) on delete set null,
  created_by         uuid default auth.uid() references public.vlasnici (user_id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  potvrden_at        timestamptz,
  storniran_at       timestamptz,

  constraint predracun_broj_uk         unique (godina, redni_broj),
  constraint predracun_broj_ck         check ((vrsta = 'predracun') = (godina is not null and redni_broj is not null)),
  constraint predracun_ugradnja_ck     check ((ugradnja_m2 is null) = (ugradnja_cijena_m2 is null)),
  constraint predracun_ljepilo_ck      check ((ljepilo_kom is null) = (ljepilo_cijena is null)),
  constraint predracun_popust_ck       check ((popust_tip is null) = (popust_vrijednost is null)),
  constraint predracun_popust_posto_ck check (popust_tip is distinct from 'posto' or popust_vrijednost <= 100),
  constraint predracun_potvrden_ck     check (status not in ('potvrden','storniran') or potvrden_at is not null),
  constraint brza_prodaja_ck           check (vrsta = 'predracun' or (
                                          status in ('potvrden','storniran')
                                          and ugradnja_m2 is null and ljepilo_kom is null and prijevoz is null))
);

create index predracuni_status_created_idx on public.predracuni (status, created_at desc);
create index predracuni_potvrden_at_idx    on public.predracuni (potvrden_at) where status in ('potvrden','storniran');
create index predracuni_kopija_od_idx      on public.predracuni (kopija_od);
create index predracuni_created_by_idx     on public.predracuni (created_by);

-- Stavke predracuna
create table public.predracun_stavke (
  id            bigint generated always as identity primary key,
  predracun_id  bigint not null references public.predracuni (id) on delete cascade,
  redoslijed    smallint not null,
  artikl_id     bigint not null references public.artikli (id) on delete restrict,
  naziv         text not null,
  cijena_kom    numeric(10,2) not null,
  m2_po_komadu  numeric(10,4),
  unos          public.jedinica_unosa not null,
  unesena_m2    numeric(10,2) check (unesena_m2 > 0),
  komada        integer not null check (komada > 0),
  iznos         numeric(12,2) not null,

  constraint stavka_unos_ck check ((unos = 'm2') = (unesena_m2 is not null)),
  constraint stavka_m2_ck   check (unos = 'kom' or m2_po_komadu is not null)
);

create index predracun_stavke_predracun_id_idx on public.predracun_stavke (predracun_id);
create index predracun_stavke_artikl_id_idx    on public.predracun_stavke (artikl_id);

-- Kretanja stanja (povijest, samo dodavanje)
create table public.kretanja_stanja (
  id           bigint generated always as identity primary key,
  artikl_id    bigint not null references public.artikli (id) on delete restrict,
  promjena     integer not null check (promjena <> 0),
  tip          public.tip_kretanja not null,
  predracun_id bigint references public.predracuni (id) on delete restrict,
  ponistava_id bigint unique references public.kretanja_stanja (id) on delete restrict,
  napomena     text,
  korisnik_id  uuid default auth.uid() references public.vlasnici (user_id) on delete set null,
  created_at   timestamptz not null default now(),

  constraint kretanje_ulaz_ck       check (tip <> 'ulaz'       or (promjena > 0 and predracun_id is null and ponistava_id is null)),
  constraint kretanje_izlaz_ck      check (tip not in ('predracun','brza_prodaja') or (promjena < 0 and predracun_id is not null)),
  constraint kretanje_storno_ck     check (tip <> 'storno'     or (promjena > 0 and predracun_id is not null)),
  constraint kretanje_ponistenje_ck check (tip <> 'ponistenje' or (promjena < 0 and ponistava_id is not null))
);

create index kretanja_artikl_vrijeme_idx on public.kretanja_stanja (artikl_id, created_at desc);
create index kretanja_predracun_id_idx   on public.kretanja_stanja (predracun_id);
create index kretanja_korisnik_id_idx    on public.kretanja_stanja (korisnik_id);
