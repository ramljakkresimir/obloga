-- 0006_prava_rls: prava na tablice + RLS (docs/DB.md §6)
-- Pokrenuti NAKON 0005_rpc.sql.
--
-- Na ovom projektu nove tablice NE dobivaju automatski select/insert/update/delete
-- za anon i authenticated (samo truncate/references/trigger/maintain).
-- Zato: prvo sve oduzmi, pa izricito dodijeli samo ono sto treba.

-- 1. Prava na tablice -------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- citanje: sve osim brojaca
grant select on
  public.vlasnici, public.postavke, public.kategorije, public.artikli,
  public.kretanja_stanja, public.predracuni, public.predracun_stavke, public.biljeske
  to authenticated;

-- postavke: samo izmjena (jedan red, bez dodavanja/brisanja)
grant update on public.postavke to authenticated;

-- kategorije i biljeske: puni CRUD
grant insert, update, delete on public.kategorije, public.biljeske to authenticated;

-- artikli: dodavanje i izmjena svega osim stupca stanje (njega mijenja samo trigger)
grant insert (kategorija_id, naziv, slika, sirina_cm, duzina_cm, m2_po_komadu, cijena_kom, min_stanje, aktivan)
  on public.artikli to authenticated;
grant update (kategorija_id, naziv, slika, sirina_cm, duzina_cm, m2_po_komadu, cijena_kom, min_stanje, aktivan)
  on public.artikli to authenticated;

-- vlasnici, kretanja_stanja, predracuni, predracun_stavke: samo citanje (pisu RPC funkcije)
-- brojaci: nikakav pristup (pise private.sljedeci_redni_broj)

-- 2. Private shema ----------------------------------------------------------
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.je_vlasnik() to authenticated;

-- 3. RLS --------------------------------------------------------------------
alter table public.vlasnici         enable row level security;
alter table public.postavke         enable row level security;
alter table public.kategorije       enable row level security;
alter table public.artikli          enable row level security;
alter table public.kretanja_stanja  enable row level security;
alter table public.brojaci          enable row level security;
alter table public.predracuni       enable row level security;
alter table public.predracun_stavke enable row level security;
alter table public.biljeske         enable row level security;

-- vlasnici: select
create policy "vlasnici_select" on public.vlasnici
  for select to authenticated using ((select private.je_vlasnik()));

-- postavke: select, update
create policy "postavke_select" on public.postavke
  for select to authenticated using ((select private.je_vlasnik()));
create policy "postavke_update" on public.postavke
  for update to authenticated
  using ((select private.je_vlasnik())) with check ((select private.je_vlasnik()));

-- kategorije: select, insert, update, delete
create policy "kategorije_select" on public.kategorije
  for select to authenticated using ((select private.je_vlasnik()));
create policy "kategorije_insert" on public.kategorije
  for insert to authenticated with check ((select private.je_vlasnik()));
create policy "kategorije_update" on public.kategorije
  for update to authenticated
  using ((select private.je_vlasnik())) with check ((select private.je_vlasnik()));
create policy "kategorije_delete" on public.kategorije
  for delete to authenticated using ((select private.je_vlasnik()));

-- artikli: select, insert, update (bez delete – arhiviranje)
create policy "artikli_select" on public.artikli
  for select to authenticated using ((select private.je_vlasnik()));
create policy "artikli_insert" on public.artikli
  for insert to authenticated with check ((select private.je_vlasnik()));
create policy "artikli_update" on public.artikli
  for update to authenticated
  using ((select private.je_vlasnik())) with check ((select private.je_vlasnik()));

-- kretanja_stanja, predracuni, predracun_stavke: samo select (pisu RPC funkcije)
create policy "kretanja_stanja_select" on public.kretanja_stanja
  for select to authenticated using ((select private.je_vlasnik()));
create policy "predracuni_select" on public.predracuni
  for select to authenticated using ((select private.je_vlasnik()));
create policy "predracun_stavke_select" on public.predracun_stavke
  for select to authenticated using ((select private.je_vlasnik()));

-- brojaci: bez politika (RLS ukljucen, pristup samo kroz RPC)

-- biljeske: select, insert, update, delete
create policy "biljeske_select" on public.biljeske
  for select to authenticated using ((select private.je_vlasnik()));
create policy "biljeske_insert" on public.biljeske
  for insert to authenticated with check ((select private.je_vlasnik()));
create policy "biljeske_update" on public.biljeske
  for update to authenticated
  using ((select private.je_vlasnik())) with check ((select private.je_vlasnik()));
create policy "biljeske_delete" on public.biljeske
  for delete to authenticated using ((select private.je_vlasnik()));
