-- 0001_enumi_vlasnici_postavke_kategorije (primijenjeno preko MCP-a, verzija 20261118180247)

-- Enumi
create type public.tip_kretanja      as enum ('ulaz', 'predracun', 'brza_prodaja', 'storno', 'ponistenje');
create type public.vrsta_prodaje     as enum ('predracun', 'brza_prodaja');
create type public.status_predracuna as enum ('otvoren', 'potvrden', 'odbijen', 'storniran');
create type public.jedinica_unosa    as enum ('m2', 'kom');
create type public.tip_popusta       as enum ('posto', 'km');

-- Shema za pomocne funkcije (nije izlozena API-ju)
create schema if not exists private;

-- Vlasnici – tko smije koristiti aplikaciju
create table public.vlasnici (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  ime        text not null,
  created_at timestamptz not null default now()
);

-- Postavke – jedan red
create table public.postavke (
  id              smallint primary key default 1 check (id = 1),
  naziv_firme     text not null,
  adresa          text,
  mjesto          text,
  telefon         text,
  email           text,
  jib             text,
  pdv_broj        text,
  u_sustavu_pdv   boolean not null default false,
  cijene_sa_pdv   boolean not null default true,
  pdv_stopa       numeric(5,2) not null default 17 check (pdv_stopa between 0 and 100),
  ljepilo_cijena  numeric(10,2) not null default 0 check (ljepilo_cijena >= 0),
  updated_at      timestamptz not null default now()
);

-- Kategorije
create table public.kategorije (
  id         bigint generated always as identity primary key,
  naziv      text not null unique check (length(trim(naziv)) > 0),
  redoslijed integer not null default 0,
  created_at timestamptz not null default now()
);
