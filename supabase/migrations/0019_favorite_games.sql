create table public.favorite_games (
  user_id uuid not null references public.profiles(id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  game_id integer not null references public.games(id),
  created_at timestamptz not null default now(),
  primary key (user_id, position)
);

alter table public.favorite_games enable row level security;

create policy "Favorite games are viewable by everyone"
  on public.favorite_games for select
  using (true);

create policy "Users can manage their own favorite games"
  on public.favorite_games for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
