insert into public.teams (name, slug)
values
  ('Team Rood', 'team-rood'),
  ('Team Blauw', 'team-blauw'),
  ('Team Groen', 'team-groen'),
  ('Team Geel', 'team-geel')
on conflict (slug) do nothing;

insert into public.proverbs (canonical_text, normalized_text)
values
  ('Te diep in het glaasje hebben gekeken', public.normalize_phrase('Te diep in het glaasje hebben gekeken')),
  ('Het glas is halfvol', public.normalize_phrase('Het glas is halfvol')),
  ('Een fles soldaat maken', public.normalize_phrase('Een fles soldaat maken')),
  ('Online pubquiz corona', public.normalize_phrase('Online pubquiz corona')),
  ('WK kelder Hans', public.normalize_phrase('WK kelder Hans')),
  ('Adoptie buurttuin burendag', public.normalize_phrase('Adoptie buurttuin burendag')),
  ('Graffiti workshop borden', public.normalize_phrase('Graffiti workshop borden')),
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

insert into public.rounds (number, title)
values
  (1, 'Ronde 1'),
  (2, 'Ronde 2'),
  (3, 'Ronde 3')
on conflict (number) do update
set title = excluded.title;

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
      (2, 'team-rood', 1, 'Online pubquiz corona'),
      (2, 'team-blauw', 1, 'WK kelder Hans'),
      (2, 'team-groen', 1, 'Adoptie buurttuin burendag'),
      (2, 'team-geel', 1, 'Graffiti workshop borden'),
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
  current_round_id = null,
  upload_ends_at = timezone('utc', now()) + interval '20 minutes',
  voting_ends_at = timezone('utc', now()) + interval '45 minutes'
where id = 'singleton';
