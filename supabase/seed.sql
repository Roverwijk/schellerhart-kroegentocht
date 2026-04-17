insert into public.teams (name, slug)
values
  ('Team Rood', 'team-rood'),
  ('Team Blauw', 'team-blauw'),
  ('Team Groen', 'team-groen'),
  ('Team Geel', 'team-geel')
on conflict (slug) do nothing;

insert into public.proverbs (canonical_text, normalized_text)
values
  ('Als de kat van huis is, dansen de muizen op tafel', public.normalize_phrase('Als de kat van huis is, dansen de muizen op tafel')),
  ('Boter bij de vis', public.normalize_phrase('Boter bij de vis')),
  ('Door de bomen het bos niet meer zien', public.normalize_phrase('Door de bomen het bos niet meer zien')),
  ('De appel valt niet ver van de boom', public.normalize_phrase('De appel valt niet ver van de boom')),
  ('Een gegeven paard niet in de bek kijken', public.normalize_phrase('Een gegeven paard niet in de bek kijken')),
  ('Oost west, thuis best', public.normalize_phrase('Oost west, thuis best')),
  ('Twee vliegen in één klap', public.normalize_phrase('Twee vliegen in één klap')),
  ('Water naar de zee dragen', public.normalize_phrase('Water naar de zee dragen'))
on conflict (normalized_text) do nothing;

update public.game_state
set
  phase = 'upload',
  upload_ends_at = timezone('utc', now()) + interval '20 minutes',
  voting_ends_at = timezone('utc', now()) + interval '45 minutes'
where id = 'singleton';
