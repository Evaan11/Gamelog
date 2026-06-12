-- Profiles (one row per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  steam_id text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile when a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '_' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Games (cached IGDB metadata)
create table public.games (
  id bigint primary key, -- IGDB game id
  name text not null,
  cover_image_id text,
  first_release_date timestamptz,
  summary text,
  total_rating numeric,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Games are viewable by everyone"
  on public.games for select using (true);

create policy "Authenticated users can insert games"
  on public.games for insert to authenticated with check (true);

-- Game entries (a user's logged status/rating/review for a game)
create type public.game_status as enum ('finished', 'playing', 'backlog', 'dropped');

create table public.game_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id bigint not null references public.games(id) on delete cascade,
  status public.game_status not null,
  rating smallint check (rating between 1 and 10),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

alter table public.game_entries enable row level security;

create policy "Entries are viewable by everyone"
  on public.game_entries for select using (true);

create policy "Users can manage their own entries"
  on public.game_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Friendships (simple mutual follow model)
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can manage their own follows"
  on public.follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);
