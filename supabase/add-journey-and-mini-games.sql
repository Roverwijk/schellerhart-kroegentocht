alter table public.game_state
add column if not exists journey_stage text null;

create table if not exists public.team_arrivals (
  id uuid primary key default gen_random_uuid(),
  journey_stage text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  arrived_at timestamptz not null default timezone('utc', now()),
  constraint team_arrivals_stage_team_key unique (journey_stage, team_id)
);

create table if not exists public.mini_game_wins (
  game_number integer primary key check (game_number in (1, 2)),
  team_id uuid not null references public.teams(id) on delete cascade,
  points integer not null default 3 check (points = 3),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_arrivals_stage_idx on public.team_arrivals(journey_stage);
create index if not exists mini_game_wins_team_id_idx on public.mini_game_wins(team_id);

alter table public.team_arrivals enable row level security;
alter table public.mini_game_wins enable row level security;

update public.game_state
set
  phase = 'waiting',
  current_round_id = null,
  journey_stage = 'round-1'
where id = 'singleton';
