create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.lists enable row level security;

create policy "Lists are viewable by everyone"
  on public.lists for select using (true);

create policy "Users can manage their own lists"
  on public.lists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.list_games (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  game_id bigint not null references public.games(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (list_id, game_id)
);

alter table public.list_games enable row level security;

create policy "List games are viewable by everyone"
  on public.list_games for select using (true);

create policy "Users can manage games in their own lists"
  on public.list_games for all
  using (exists (select 1 from public.lists where lists.id = list_id and lists.user_id = auth.uid()))
  with check (exists (select 1 from public.lists where lists.id = list_id and lists.user_id = auth.uid()));
