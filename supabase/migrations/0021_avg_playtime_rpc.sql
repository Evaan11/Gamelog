create or replace function games_by_avg_playtime(p_limit int, p_offset int)
returns table (game_id bigint, avg_playtime numeric)
language sql
stable
as $$
  select game_id, avg(playtime_minutes)::numeric as avg_playtime
  from game_entries
  where playtime_minutes is not null
  group by game_id
  order by avg_playtime desc
  limit p_limit
  offset p_offset;
$$;
