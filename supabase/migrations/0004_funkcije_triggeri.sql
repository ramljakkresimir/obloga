-- 0004_funkcije_triggeri (primijenjeno preko MCP-a, verzija 20261118180324)

-- Je li trenutni korisnik vlasnik?
create function private.je_vlasnik() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.vlasnici where user_id = (select auth.uid()));
$$;

-- Sljedeci redni broj predracuna za godinu (atomski)
create function private.sljedeci_redni_broj(p_godina smallint) returns integer
language sql set search_path = ''
as $$
  insert into public.brojaci (godina, zadnji) values (p_godina, 1)
  on conflict (godina) do update set zadnji = public.brojaci.zadnji + 1
  returning zadnji;
$$;

-- updated_at
create function private.postavi_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

-- Stanje = stanje + promjena (jedino mjesto gdje se mijenja artikli.stanje)
create function private.azuriraj_stanje() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.artikli set stanje = stanje + new.promjena where id = new.artikl_id;
  return new;
end $$;

create trigger kretanja_azuriraj_stanje after insert on public.kretanja_stanja
  for each row execute function private.azuriraj_stanje();

create trigger artikli_updated_at    before update on public.artikli    for each row execute function private.postavi_updated_at();
create trigger predracuni_updated_at before update on public.predracuni for each row execute function private.postavi_updated_at();
create trigger biljeske_updated_at   before update on public.biljeske   for each row execute function private.postavi_updated_at();
create trigger postavke_updated_at   before update on public.postavke   for each row execute function private.postavi_updated_at();
