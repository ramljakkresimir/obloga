-- 0010_predracun_excel_predlozak: PDF predračuna po Excel predlošku "Predračun Obloga.ba.xlsx".
--   * postavke: vlasnik, banka, transakcijski račun, web i društvene mreže (zaglavlje PDF-a)
--   * predracuni: adresa i JIB kupca, svrha, način plaćanja, datum isporuke, rok valjanosti
--   * broj predračuna u formatu iz Excela: "<redni broj>-<godina na 2 znamenke>." (npr. "23-26.")
--     Broj je generiran iz godina + redni_broj, pa i postojeći predračuni dobivaju novi prikaz.
-- Prava: postavke i predracuni imaju prava na razini tablice (0006), pa nova polja ne trebaju nove grantove.

-- 1. Postavke ---------------------------------------------------------------
alter table public.postavke
  add column vlasnik             text,
  add column banka               text,
  add column transakcijski_racun text,
  add column web                 text,
  add column instagram           text,
  add column whatsapp            text,
  add column viber               text;

-- 2. Predračuni -------------------------------------------------------------
alter table public.predracuni
  add column kupac_adresa   text,
  add column kupac_jib      text,
  add column svrha          text,
  add column nacin_placanja text,
  add column datum_isporuke date,
  add column vrijedi_dana   smallint check (vrijedi_dana between 1 and 365);

-- 3. Format broja (PG17: izraz generiranog stupca se mijenja na mjestu) -------
alter table public.predracuni alter column broj set expression as (
  case when redni_broj is null then null
       else redni_broj::text || '-' || lpad((godina % 100)::text, 2, '0') || '.'
  end
);

-- 4. spremi_predracun: upisuje i nova polja --------------------------------
create or replace function public.spremi_predracun(p_id bigint, p_podaci jsonb) returns bigint
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
      kupac_ime, kupac_telefon, kupac_mjesto, kupac_adresa, kupac_jib, napomena,
      svrha, nacin_placanja, datum_isporuke, vrijedi_dana,
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
      nullif(trim(p_podaci->>'kupac_adresa'), ''),
      nullif(trim(p_podaci->>'kupac_jib'), ''),
      nullif(trim(p_podaci->>'napomena'), ''),
      nullif(trim(p_podaci->>'svrha'), ''),
      nullif(trim(p_podaci->>'nacin_placanja'), ''),
      nullif(p_podaci->>'datum_isporuke', '')::date,
      (p_podaci->>'vrijedi_dana')::smallint,
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
      kupac_adresa       = nullif(trim(p_podaci->>'kupac_adresa'), ''),
      kupac_jib          = nullif(trim(p_podaci->>'kupac_jib'), ''),
      napomena           = nullif(trim(p_podaci->>'napomena'), ''),
      svrha              = nullif(trim(p_podaci->>'svrha'), ''),
      nacin_placanja     = nullif(trim(p_podaci->>'nacin_placanja'), ''),
      datum_isporuke     = nullif(p_podaci->>'datum_isporuke', '')::date,
      vrijedi_dana       = (p_podaci->>'vrijedi_dana')::smallint,
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
