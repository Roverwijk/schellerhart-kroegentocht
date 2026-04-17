create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_phase') then
    create type game_phase as enum ('waiting', 'upload', 'voting', 'results');
  end if;
end $$;

create or replace function public.normalize_phrase(input text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^[:alnum:][:space:]]+', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.proverbs (
  id uuid primary key default gen_random_uuid(),
  canonical_text text not null unique,
  normalized_text text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  proverb_id uuid not null references public.proverbs(id) on delete restrict,
  photo_path text not null,
  photo_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  guessed_text text not null,
  guessed_normalized text not null,
  guessed_proverb_id uuid null references public.proverbs(id) on delete set null,
  is_correct boolean not null default false,
  override_is_correct boolean null,
  resolved_is_correct boolean generated always as (coalesce(override_is_correct, is_correct)) stored,
  created_at timestamptz not null default timezone('utc', now()),
  constraint votes_team_id_submission_id_key unique (team_id, submission_id)
);

create table if not exists public.game_state (
  id text primary key default 'singleton' check (id = 'singleton'),
  phase game_phase not null default 'upload',
  upload_ends_at timestamptz null,
  voting_ends_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists submissions_team_id_idx on public.submissions(team_id);
create index if not exists submissions_created_at_idx on public.submissions(created_at);
create index if not exists votes_submission_id_idx on public.votes(submission_id);
create index if not exists votes_team_id_idx on public.votes(team_id);
create index if not exists proverbs_normalized_text_idx on public.proverbs(normalized_text);

drop trigger if exists proverbs_set_updated_at on public.proverbs;
create trigger proverbs_set_updated_at
before update on public.proverbs
for each row
execute function public.set_updated_at();

drop trigger if exists game_state_set_updated_at on public.game_state;
create trigger game_state_set_updated_at
before update on public.game_state
for each row
execute function public.set_updated_at();

insert into public.game_state (id, phase, upload_ends_at, voting_ends_at)
values (
  'singleton',
  'waiting',
  timezone('utc', now()) + interval '20 minutes',
  timezone('utc', now()) + interval '45 minutes'
)
on conflict (id) do nothing;

alter table public.teams enable row level security;
alter table public.proverbs enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.game_state enable row level security;

drop policy if exists "public can read teams" on public.teams;
create policy "public can read teams"
on public.teams
for select
to anon, authenticated
using (true);

drop policy if exists "public can read proverbs" on public.proverbs;
create policy "public can read proverbs"
on public.proverbs
for select
to anon, authenticated
using (true);

drop policy if exists "public can read game_state" on public.game_state;
create policy "public can read game_state"
on public.game_state
for select
to anon, authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('submission-photos', 'submission-photos', true)
on conflict (id) do nothing;

drop policy if exists "public can read submission photos" on storage.objects;
create policy "public can read submission photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'submission-photos');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_state'
  ) then
    alter publication supabase_realtime add table public.game_state;
  end if;
end $$;
