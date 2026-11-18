-- 0007_storage (primijenjeno preko MCP-a, verzija 20261118181146)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slike-obloga', 'slike-obloga', true, 2097152,
        array['image/webp', 'image/jpeg', 'image/png']);

create policy "slike_select" on storage.objects for select to authenticated
  using (bucket_id = 'slike-obloga' and (select private.je_vlasnik()));
create policy "slike_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'slike-obloga' and (select private.je_vlasnik()));
create policy "slike_update" on storage.objects for update to authenticated
  using (bucket_id = 'slike-obloga' and (select private.je_vlasnik()))
  with check (bucket_id = 'slike-obloga' and (select private.je_vlasnik()));
create policy "slike_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'slike-obloga' and (select private.je_vlasnik()));
