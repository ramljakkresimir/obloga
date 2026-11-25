-- 0011_popust_stavke: popust na svakoj stavci (oblozi) predračuna i brze prodaje.
--   * popust_tip / popust_vrijednost: kako je upisan (% ili KM na cijelu stavku); null = bez popusta
--   * popust_iznos: izračunati popust stavke u KM
--   * iznos: kao i prije, iznos stavke koji ulazi u zbroj, sada NAKON popusta stavke
-- Stari retci dobivaju popust_iznos = 0, pa im se iznos ne mijenja.
-- Ukupni popust (predracuni.popust_*) ostaje i računa se na zbroj nakon popusta stavki.

alter table public.predracun_stavke
  add column popust_tip        public.tip_popusta,
  add column popust_vrijednost numeric(10,2) check (popust_vrijednost >= 0),
  add column popust_iznos      numeric(12,2) not null default 0 check (popust_iznos >= 0),
  add constraint stavka_popust_ck check ((popust_tip is null) = (popust_vrijednost is null));

-- upis stavki (koriste je spremi_predracun i brza_prodaja)
create or replace function private.upisi_stavke(p_predracun_id bigint, p_stavke jsonb) returns void
language sql set search_path = ''
as $$
  insert into public.predracun_stavke
    (predracun_id, redoslijed, artikl_id, naziv, cijena_kom, m2_po_komadu, unos, unesena_m2, komada,
     popust_tip, popust_vrijednost, popust_iznos, iznos)
  select p_predracun_id,
         e.ord::smallint,
         (e.s->>'artikl_id')::bigint,
         e.s->>'naziv',
         (e.s->>'cijena_kom')::numeric,
         (e.s->>'m2_po_komadu')::numeric,
         (e.s->>'unos')::public.jedinica_unosa,
         (e.s->>'unesena_m2')::numeric,
         (e.s->>'komada')::integer,
         nullif(e.s->>'popust_tip', '')::public.tip_popusta,
         (e.s->>'popust_vrijednost')::numeric,
         coalesce((e.s->>'popust_iznos')::numeric, 0),
         (e.s->>'iznos')::numeric
  from jsonb_array_elements(p_stavke) with ordinality as e(s, ord);
$$;
