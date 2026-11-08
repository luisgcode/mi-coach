-- Mi Coach: one JSON document store per user, private photo bucket.

create table if not exists public.docs (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  path       text        not null check (path ~ '^[A-Za-z0-9_.~:@+-]+(/[A-Za-z0-9_.~:@+-]+)+$'),
  coll       text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner, path)
);
create index if not exists docs_owner_coll_idx on public.docs (owner, coll);

alter table public.docs enable row level security;

drop policy if exists docs_select on public.docs;
drop policy if exists docs_insert on public.docs;
drop policy if exists docs_update on public.docs;
drop policy if exists docs_delete on public.docs;
create policy docs_select on public.docs for select to authenticated using (owner = auth.uid());
create policy docs_insert on public.docs for insert to authenticated with check (owner = auth.uid());
create policy docs_update on public.docs for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy docs_delete on public.docs for delete to authenticated using (owner = auth.uid());

-- Shallow merge (data || patch). Returns false when the doc does not exist.
create or replace function public.merge_doc(p_path text, p_patch jsonb)
returns boolean
language sql
security invoker
set search_path = public
as $$
  with u as (
    update public.docs
       set data = data || p_patch, updated_at = now()
     where owner = auth.uid() and path = p_path
    returning 1
  )
  select exists (select 1 from u);
$$;
grant execute on function public.merge_doc(text, jsonb) to authenticated;

-- Realtime: full rows so delete events carry the path and the owner filter works.
alter table public.docs replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- Storage: private bucket "fotos"; each user only touches "{uid}/..." objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists fotos_select on storage.objects;
drop policy if exists fotos_insert on storage.objects;
drop policy if exists fotos_update on storage.objects;
drop policy if exists fotos_delete on storage.objects;
create policy fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
