do $$
begin
  begin
    alter type public.game_phase add value 'waiting' before 'upload';
  exception
    when duplicate_object then null;
  end;
end $$;

update public.game_state
set phase = 'waiting'
where id = 'singleton'
  and phase not in ('waiting', 'upload', 'voting', 'results');
