
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- Auto-promote first signup to admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SITE SETTINGS (single row)
create table public.site_settings (
  id int primary key default 1,
  site_name text not null default '极客软件馆',
  logo text not null default '',
  hero_title text not null default '软件目录',
  subtitle text not null default '精选软件、网站与教程',
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);
insert into public.site_settings (id) values (1);

grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;

create policy "anyone reads site settings" on public.site_settings
  for select to anon, authenticated using (true);
create policy "admins update site settings" on public.site_settings
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- NOTES
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  tags text[] not null default '{}',
  published boolean not null default true,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_updated_at_idx on public.notes (updated_at desc);
create index notes_tags_idx on public.notes using gin (tags);

grant select on public.notes to anon, authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;

create policy "anyone reads published notes" on public.notes
  for select to anon, authenticated using (published = true);
create policy "admins read all notes" on public.notes
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins insert notes" on public.notes
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update notes" on public.notes
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admins delete notes" on public.notes
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- NOTE REVISIONS (edit history)
create table public.note_revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  tags text[] not null default '{}',
  editor_id uuid references auth.users(id) on delete set null,
  edited_at timestamptz not null default now()
);

create index note_revisions_note_idx on public.note_revisions (note_id, edited_at desc);

grant select on public.note_revisions to authenticated;
grant all on public.note_revisions to service_role;
alter table public.note_revisions enable row level security;

create policy "admins read revisions" on public.note_revisions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Trigger to snapshot revisions and bump updated_at
create or replace function public.snapshot_note_revision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  insert into public.note_revisions (note_id, content, tags, editor_id)
    values (new.id, new.content, new.tags, auth.uid());
  return new;
end; $$;

create trigger notes_revision_on_insert
  after insert on public.notes
  for each row execute function public.snapshot_note_revision();

create or replace function public.snapshot_note_revision_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.content is distinct from old.content or new.tags is distinct from old.tags then
    insert into public.note_revisions (note_id, content, tags, editor_id)
      values (new.id, new.content, new.tags, auth.uid());
  end if;
  return new;
end; $$;

create trigger notes_revision_on_update
  before update on public.notes
  for each row execute function public.snapshot_note_revision_update();
