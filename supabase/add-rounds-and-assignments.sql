create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  title text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  proverb_id uuid not null references public.proverbs(id) on delete restrict,
  slot integer not null check (slot in (1, 2)),
  created_at timestamptz not null default timezone('utc', now()),
  constraint assignments_round_team_slot_key unique (round_id, team_id, slot)
);

alter table public.game_state
add column if not exists current_round_id uuid null references public.rounds(id) on delete set null;

alter table public.submissions
add column if not exists assignment_id uuid null references public.assignments(id) on delete cascade;

create index if not exists assignments_round_id_idx on public.assignments(round_id);
create index if not exists assignments_team_id_idx on public.assignments(team_id);
create unique index if not exists submissions_assignment_id_key on public.submissions(assignment_id) where assignment_id is not null;

alter table public.rounds enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "public can read rounds" on public.rounds;
create policy "public can read rounds"
on public.rounds
for select
to anon, authenticated
using (true);

drop policy if exists "public can read assignments" on public.assignments;
create policy "public can read assignments"
on public.assignments
for select
to anon, authenticated
using (true);

insert into public.rounds (number, title)
values
  (1, 'Ronde 1'),
  (2, 'Ronde 2'),
  (3, 'Ronde 3')
on conflict (number) do update
set title = excluded.title;

insert into public.proverbs (canonical_text, normalized_text)
values
  ('Te diep in het glaasje hebben gekeken', public.normalize_phrase('Te diep in het glaasje hebben gekeken')),
  ('Het glas is halfvol', public.normalize_phrase('Het glas is halfvol')),
  ('Een fles soldaat maken', public.normalize_phrase('Een fles soldaat maken')),
  ('Met de neus in de boter vallen', public.normalize_phrase('Met de neus in de boter vallen')),
  ('Boter bij de vis', public.normalize_phrase('Boter bij de vis')),
  ('Roet in het eten gooien', public.normalize_phrase('Roet in het eten gooien')),
  ('Als de kat van huis is, dansen de muizen op tafel', public.normalize_phrase('Als de kat van huis is, dansen de muizen op tafel')),
  ('Een stuk in de kraag drinken', public.normalize_phrase('Een stuk in de kraag drinken')),
  ('Een storm in een glas water', public.normalize_phrase('Een storm in een glas water')),
  ('Uit een ander vaatje tappen', public.normalize_phrase('Uit een ander vaatje tappen')),
  ('Dat scheelt een slok op een borrel', public.normalize_phrase('Dat scheelt een slok op een borrel')),
  ('Water bij de wijn doen', public.normalize_phrase('Water bij de wijn doen')),
  ('Tussen wal en schip vallen', public.normalize_phrase('Tussen wal en schip vallen')),
  ('Iemand onder de tafel drinken', public.normalize_phrase('Iemand onder de tafel drinken')),
  ('Het roer omgooien', public.normalize_phrase('Het roer omgooien')),
  ('Een afzakkertje nemen', public.normalize_phrase('Een afzakkertje nemen')),
  ('Met de gebakken peren zitten', public.normalize_phrase('Met de gebakken peren zitten')),
  ('Hand in eigen boezem steken', public.normalize_phrase('Hand in eigen boezem steken')),
  ('Voor Pampus liggen', public.normalize_phrase('Voor Pampus liggen')),
  ('Om de hete brij heen draaien', public.normalize_phrase('Om de hete brij heen draaien')),
  ('Zo dronken als een tor', public.normalize_phrase('Zo dronken als een tor')),
  ('Wind in de zeilen hebben', public.normalize_phrase('Wind in de zeilen hebben')),
  ('Oude wijn in nieuwe zakken', public.normalize_phrase('Oude wijn in nieuwe zakken')),
  ('De bloemetjes buiten zetten', public.normalize_phrase('De bloemetjes buiten zetten')),
  ('In iemands vaarwater zitten', public.normalize_phrase('In iemands vaarwater zitten')),
  ('Op een droogje zitten', public.normalize_phrase('Op een droogje zitten')),
  ('De gifbeker leegdrinken', public.normalize_phrase('De gifbeker leegdrinken'))
on conflict (normalized_text) do nothing;

with assignment_source as (
  select *
  from (
    values
      (1, 'team-rood', 1, 'Te diep in het glaasje hebben gekeken'),
      (1, 'team-rood', 2, 'Uit een ander vaatje tappen'),
      (1, 'team-blauw', 1, 'Het glas is halfvol'),
      (1, 'team-blauw', 2, 'De gifbeker leegdrinken'),
      (1, 'team-groen', 1, 'Een fles soldaat maken'),
      (1, 'team-groen', 2, 'Iemand onder de tafel drinken'),
      (1, 'team-geel', 1, 'Een stuk in de kraag drinken'),
      (1, 'team-geel', 2, 'Een storm in een glas water'),
      (2, 'team-rood', 1, 'Met de neus in de boter vallen'),
      (2, 'team-rood', 2, 'Voor Pampus liggen'),
      (2, 'team-blauw', 1, 'Boter bij de vis'),
      (2, 'team-blauw', 2, 'Tussen wal en schip vallen'),
      (2, 'team-groen', 1, 'Roet in het eten gooien'),
      (2, 'team-groen', 2, 'Het roer omgooien'),
      (2, 'team-geel', 1, 'Met de gebakken peren zitten'),
      (2, 'team-geel', 2, 'In iemands vaarwater zitten'),
      (3, 'team-rood', 1, 'Dat scheelt een slok op een borrel'),
      (3, 'team-rood', 2, 'Om de hete brij heen draaien'),
      (3, 'team-blauw', 1, 'Zo dronken als een tor'),
      (3, 'team-blauw', 2, 'Water bij de wijn doen'),
      (3, 'team-groen', 1, 'Oude wijn in nieuwe zakken'),
      (3, 'team-groen', 2, 'Een afzakkertje nemen'),
      (3, 'team-geel', 1, 'Hand in eigen boezem steken'),
      (3, 'team-geel', 2, 'Op een droogje zitten')
  ) as rows(round_number, team_slug, slot, proverb_text)
)
insert into public.assignments (round_id, team_id, proverb_id, slot)
select
  rounds.id,
  teams.id,
  proverbs.id,
  assignment_source.slot
from assignment_source
join public.rounds on rounds.number = assignment_source.round_number
join public.teams on teams.slug = assignment_source.team_slug
join public.proverbs on proverbs.normalized_text = public.normalize_phrase(assignment_source.proverb_text)
on conflict (round_id, team_id, slot) do update
set proverb_id = excluded.proverb_id;

update public.game_state
set
  phase = 'waiting',
  current_round_id = null
where id = 'singleton';
