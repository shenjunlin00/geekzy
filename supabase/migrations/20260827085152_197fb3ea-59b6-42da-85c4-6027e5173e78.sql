create policy "note images readable" on storage.objects for select to anon, authenticated using (bucket_id = 'note-images');

alter table public.notes disable trigger user;
update public.notes
set content = regexp_replace(content, 'data:image/[A-Za-z0-9.+-]+;base64,[A-Za-z0-9+/=]+', '/api/public/img/' || id::text || '-0.webp', 'g')
where content like '%src="data:%';
alter table public.notes enable trigger user;

delete from public.note_revisions where content like '%;base64,%';