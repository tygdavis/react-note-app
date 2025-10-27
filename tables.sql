create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(content,'')), 'B')
  ) stored
);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index notes_search_idx on public.notes using gin (search);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger notes_touch_updated_at
before update on public.notes
for each row execute function public.touch_updated_at();

create or replace function public.set_note_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  return new;
end $$;

create trigger notes_set_owner
before insert on public.notes
for each row execute function public.set_note_owner();

alter table public.notes enable row level security;

create policy "select own notes" on public.notes for select using (user_id = auth.uid());
create policy "modify own notes" on public.notes for update using (user_id = auth.uid());
create policy "insert own notes" on public.notes for insert with check (user_id = auth.uid());
create policy "delete own notes" on public.notes for delete using (user_id = auth.uid());
