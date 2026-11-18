-- 0008_pocetni_podaci (primijenjeno preko MCP-a, verzija 20261118181150)

insert into public.kategorije (naziv, redoslijed) values
  ('PVC/SPC zidne obloge', 1),
  ('Akustični paneli',     2),
  ('CarbonWood paneli',    3),
  ('Fasadni WPC paneli',   4),
  ('Metalni paneli',       5),
  ('Zeleni zid',           6);

insert into public.postavke (id, naziv_firme, adresa, mjesto, telefon, email)
values (1, 'Obloga.ba', 'Sarajevska b.b.', '72230 Žepče', '+387 63 766 063', 'info@obloga.ba');
