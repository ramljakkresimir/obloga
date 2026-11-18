-- 0005_rpc: RPC funkcije (docs/DB.md §5.3)
-- Pokrenuti PRIJE 0006_prava_rls.sql.

-- Pomocna: upis stavki iz p_podaci->'stavke' (redoslijed = pozicija u nizu)
create function private.upisi_stavke(p_predracun_id bigint, p_stavke jsonb) returns void
language sql set search_path = ''
as $$
  insert into public.predracun_stavke
    (predracun_id, redoslijed, artikl_id, naziv, cijena_kom, m2_po_komadu, unos, unesena_m2, komada, iznos)
  select p_predracun_id,
         e.ord::smallint,
         (e.s->>'artikl_id')::bigint,
         e.s->>'naziv',
         (e.s->>'cijena_kom')::numeric,
         (e.s->>'m2_po_komadu')::numeric,
         (e.s->>'unos')::public.jedinica_unosa,
         (e.s->>'unesena_m2')::numeric,
         (e.s->>'komada')::integer,
         (e.s->>'iznos')::numeric
  from jsonb_array_elements(p_stavke) with ordinality as e(s, ord);
$$;

-- ulaz_robe -----------------------------------------------------------------
create function public.ulaz_robe(p_stavke jsonb, p_napomena text default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_broj integer;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  if p_stavke is null or jsonb_typeof(p_stavke) <> 'array' then
    raise exception 'Neispravne stavke ulaza.' using errcode = 'P0001';
  end if;

  if exists (select 1 from jsonb_array_elements(p_stavke) e where (e->>'kolicina')::integer < 0) then
    raise exception 'Količina ne smije biti negativna.' using errcode = 'P0001';
  end if;

  insert into public.kretanja_stanja (artikl_id, promjena, tip, napomena)
  select (e->>'artikl_id')::bigint, (e->>'kolicina')::integer, 'ulaz', nullif(trim(p_napomena), '')
  from jsonb_array_elements(p_stavke) e
  where coalesce((e->>'kolicina')::integer, 0) > 0;

  get diagnostics v_broj = row_count;
  return v_broj;
end $$;

-- ponisti_ulaz --------------------------------------------------------------
create function public.ponisti_ulaz(p_kretanje_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_k public.kretanja_stanja;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  select * into v_k from public.kretanja_stanja where id = p_kretanje_id for update;

  if not found then
    raise exception 'Kretanje ne postoji.' using errcode = 'P0001';
  end if;
  if v_k.tip <> 'ulaz' then
    raise exception 'Poništiti se može samo ulaz robe.' using errcode = 'P0001';
  end if;

  begin
    insert into public.kretanja_stanja (artikl_id, promjena, tip, ponistava_id, napomena)
    values (v_k.artikl_id, -v_k.promjena, 'ponistenje', v_k.id,
            'Poništen ulaz od ' || to_char(v_k.created_at at time zone 'Europe/Sarajevo', 'DD.MM.YYYY.'));
  exception when unique_violation then
    raise exception 'Ovaj ulaz je već poništen.' using errcode = 'P0001';
  end;
end $$;

-- spremi_predracun (novi ili izmjena otvorenog) ------------------------------
create function public.spremi_predracun(p_id bigint, p_podaci jsonb) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_id     bigint;
  v_godina smallint;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  if p_podaci is null
     or jsonb_typeof(p_podaci->'stavke') is distinct from 'array'
     or jsonb_array_length(p_podaci->'stavke') = 0 then
    raise exception 'Predračun mora imati barem jednu stavku.' using errcode = 'P0001';
  end if;

  if p_id is null then
    v_godina := extract(year from now() at time zone 'Europe/Sarajevo')::smallint;

    insert into public.predracuni (
      vrsta, godina, redni_broj, status,
      kupac_ime, kupac_telefon, kupac_mjesto, napomena,
      ugradnja_m2, ugradnja_cijena_m2, ljepilo_kom, ljepilo_cijena, prijevoz,
      popust_tip, popust_vrijednost,
      pdv_u_sustavu, pdv_cijene_sa_pdv, pdv_stopa,
      medjuzbroj, popust_iznos, osnovica, pdv_iznos, ukupno,
      kopija_od
    ) values (
      'predracun', v_godina, private.sljedeci_redni_broj(v_godina), 'otvoren',
      nullif(trim(p_podaci->>'kupac_ime'), ''),
      nullif(trim(p_podaci->>'kupac_telefon'), ''),
      nullif(trim(p_podaci->>'kupac_mjesto'), ''),
      nullif(trim(p_podaci->>'napomena'), ''),
      (p_podaci->>'ugradnja_m2')::numeric,
      (p_podaci->>'ugradnja_cijena_m2')::numeric,
      (p_podaci->>'ljepilo_kom')::integer,
      (p_podaci->>'ljepilo_cijena')::numeric,
      (p_podaci->>'prijevoz')::numeric,
      nullif(p_podaci->>'popust_tip', '')::public.tip_popusta,
      (p_podaci->>'popust_vrijednost')::numeric,
      (p_podaci->>'pdv_u_sustavu')::boolean,
      (p_podaci->>'pdv_cijene_sa_pdv')::boolean,
      (p_podaci->>'pdv_stopa')::numeric,
      (p_podaci->>'medjuzbroj')::numeric,
      coalesce((p_podaci->>'popust_iznos')::numeric, 0),
      (p_podaci->>'osnovica')::numeric,
      coalesce((p_podaci->>'pdv_iznos')::numeric, 0),
      (p_podaci->>'ukupno')::numeric,
      (p_podaci->>'kopija_od')::bigint
    )
    returning id into v_id;
  else
    -- PDV snimak i kopija_od se ne mijenjaju
    update public.predracuni set
      kupac_ime          = nullif(trim(p_podaci->>'kupac_ime'), ''),
      kupac_telefon      = nullif(trim(p_podaci->>'kupac_telefon'), ''),
      kupac_mjesto       = nullif(trim(p_podaci->>'kupac_mjesto'), ''),
      napomena           = nullif(trim(p_podaci->>'napomena'), ''),
      ugradnja_m2        = (p_podaci->>'ugradnja_m2')::numeric,
      ugradnja_cijena_m2 = (p_podaci->>'ugradnja_cijena_m2')::numeric,
      ljepilo_kom        = (p_podaci->>'ljepilo_kom')::integer,
      ljepilo_cijena     = (p_podaci->>'ljepilo_cijena')::numeric,
      prijevoz           = (p_podaci->>'prijevoz')::numeric,
      popust_tip         = nullif(p_podaci->>'popust_tip', '')::public.tip_popusta,
      popust_vrijednost  = (p_podaci->>'popust_vrijednost')::numeric,
      medjuzbroj         = (p_podaci->>'medjuzbroj')::numeric,
      popust_iznos       = coalesce((p_podaci->>'popust_iznos')::numeric, 0),
      osnovica           = (p_podaci->>'osnovica')::numeric,
      pdv_iznos          = coalesce((p_podaci->>'pdv_iznos')::numeric, 0),
      ukupno             = (p_podaci->>'ukupno')::numeric
    where id = p_id and vrsta = 'predracun' and status = 'otvoren'
    returning id into v_id;

    if v_id is null then
      raise exception 'Predračun se može urediti samo dok je otvoren.' using errcode = 'P0001';
    end if;

    delete from public.predracun_stavke where predracun_id = v_id;
  end if;

  perform private.upisi_stavke(v_id, p_podaci->'stavke');
  return v_id;
end $$;

-- potvrdi_predracun ---------------------------------------------------------
create function public.potvrdi_predracun(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.status_predracuna;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  select status into v_status
  from public.predracuni
  where id = p_id and vrsta = 'predracun'
  for update;

  if not found then
    raise exception 'Predračun ne postoji.' using errcode = 'P0001';
  end if;
  if v_status <> 'otvoren' then
    raise exception 'Samo otvoren predračun se može potvrditi.' using errcode = 'P0001';
  end if;

  update public.predracuni
     set status = 'potvrden', potvrden_at = now()
   where id = p_id;

  insert into public.kretanja_stanja (artikl_id, promjena, tip, predracun_id)
  select artikl_id, -komada, 'predracun', p_id
  from public.predracun_stavke
  where predracun_id = p_id
  order by redoslijed;
end $$;

-- odbij_predracun -----------------------------------------------------------
create function public.odbij_predracun(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.status_predracuna;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  select status into v_status
  from public.predracuni
  where id = p_id and vrsta = 'predracun'
  for update;

  if not found then
    raise exception 'Predračun ne postoji.' using errcode = 'P0001';
  end if;
  if v_status <> 'otvoren' then
    raise exception 'Samo otvoren predračun se može odbiti.' using errcode = 'P0001';
  end if;

  update public.predracuni set status = 'odbijen' where id = p_id;
end $$;

-- storniraj_predracun (predracun i brza prodaja) -----------------------------
create function public.storniraj_predracun(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.status_predracuna;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  select status into v_status
  from public.predracuni
  where id = p_id
  for update;

  if not found then
    raise exception 'Prodaja ne postoji.' using errcode = 'P0001';
  end if;
  if v_status <> 'potvrden' then
    raise exception 'Stornirati se može samo potvrđena prodaja.' using errcode = 'P0001';
  end if;

  update public.predracuni
     set status = 'storniran', storniran_at = now()
   where id = p_id;

  insert into public.kretanja_stanja (artikl_id, promjena, tip, predracun_id)
  select artikl_id, komada, 'storno', p_id
  from public.predracun_stavke
  where predracun_id = p_id
  order by redoslijed;
end $$;

-- brza_prodaja --------------------------------------------------------------
create function public.brza_prodaja(p_podaci jsonb) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  if p_podaci is null
     or jsonb_typeof(p_podaci->'stavke') is distinct from 'array'
     or jsonb_array_length(p_podaci->'stavke') = 0 then
    raise exception 'Prodaja mora imati barem jednu stavku.' using errcode = 'P0001';
  end if;

  insert into public.predracuni (
    vrsta, status, potvrden_at, napomena,
    popust_tip, popust_vrijednost,
    pdv_u_sustavu, pdv_cijene_sa_pdv, pdv_stopa,
    medjuzbroj, popust_iznos, osnovica, pdv_iznos, ukupno
  ) values (
    'brza_prodaja', 'potvrden', now(), nullif(trim(p_podaci->>'napomena'), ''),
    nullif(p_podaci->>'popust_tip', '')::public.tip_popusta,
    (p_podaci->>'popust_vrijednost')::numeric,
    (p_podaci->>'pdv_u_sustavu')::boolean,
    (p_podaci->>'pdv_cijene_sa_pdv')::boolean,
    (p_podaci->>'pdv_stopa')::numeric,
    (p_podaci->>'medjuzbroj')::numeric,
    coalesce((p_podaci->>'popust_iznos')::numeric, 0),
    (p_podaci->>'osnovica')::numeric,
    coalesce((p_podaci->>'pdv_iznos')::numeric, 0),
    (p_podaci->>'ukupno')::numeric
  )
  returning id into v_id;

  perform private.upisi_stavke(v_id, p_podaci->'stavke');

  insert into public.kretanja_stanja (artikl_id, promjena, tip, predracun_id)
  select artikl_id, -komada, 'brza_prodaja', v_id
  from public.predracun_stavke
  where predracun_id = v_id
  order by redoslijed;

  return v_id;
end $$;

-- ping (keepalive) ----------------------------------------------------------
create function public.ping() returns timestamptz
language sql stable security invoker set search_path = ''
as $$ select now(); $$;

-- Prava na funkcije ---------------------------------------------------------
revoke execute on function
  public.ulaz_robe(jsonb, text),
  public.ponisti_ulaz(bigint),
  public.spremi_predracun(bigint, jsonb),
  public.potvrdi_predracun(bigint),
  public.odbij_predracun(bigint),
  public.storniraj_predracun(bigint),
  public.brza_prodaja(jsonb)
from public, anon;

grant execute on function
  public.ulaz_robe(jsonb, text),
  public.ponisti_ulaz(bigint),
  public.spremi_predracun(bigint, jsonb),
  public.potvrdi_predracun(bigint),
  public.odbij_predracun(bigint),
  public.storniraj_predracun(bigint),
  public.brza_prodaja(jsonb)
to authenticated;

revoke execute on function public.ping() from public;
grant  execute on function public.ping() to anon, authenticated;
