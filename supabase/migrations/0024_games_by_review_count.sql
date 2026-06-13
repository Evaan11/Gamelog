create or replace function games_by_review_count(p_limit int, p_offset int)
returns table (game_id bigint, review_count bigint)
language sql
stable
as $$
  select game_id, count(*)::bigint as review_count
  from game_entries
  where review is not null and trim(review) <> ''
  group by game_id
  order by review_count desc
  limit p_limit
  offset p_offset;
$$;
