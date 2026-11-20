-- Trajno brisanje obloge koja nikad nije prodana (DB.md §5.3).
-- Dopušteno samo ako obloga nije ni u jednom predračunu (bilo kojeg statusa) ni u brzoj prodaji.
-- Tada se brišu i njena kretanja (samo ulazi i poništenja). Vraća staru putanju slike;
-- datoteke iz Storagea briše Server Action.

create function public.obrisi_oblogu(p_id bigint) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_slika text;
begin
  if not private.je_vlasnik() then
    raise exception 'Nemate pristup.' using errcode = '42501';
  end if;

  select slika into v_slika from public.artikli where id = p_id for update;
  if not found then
    raise exception 'Obloga ne postoji.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.predracun_stavke where artikl_id = p_id)
     or exists (
       select 1 from public.kretanja_stanja
       where artikl_id = p_id and tip not in ('ulaz', 'ponistenje')
     ) then
    raise exception 'Obloga je korištena u predračunu ili prodaji i ne može se obrisati. Možete je arhivirati.'
      using errcode = 'P0001';
  end if;

  -- Prvo poništenja (referenciraju ulaz preko ponistava_id), zatim ulazi.
  -- Trigger stanja je samo "after insert", pa brisanje ne mijenja stanje.
  delete from public.kretanja_stanja where artikl_id = p_id and tip = 'ponistenje';
  delete from public.kretanja_stanja where artikl_id = p_id and tip = 'ulaz';
  delete from public.artikli where id = p_id;

  return v_slika;
end $$;

revoke execute on function public.obrisi_oblogu(bigint) from public, anon;
grant  execute on function public.obrisi_oblogu(bigint) to authenticated;
