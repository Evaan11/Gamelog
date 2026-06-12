-- Likes on reviews (game_entries with a review)
create table public.review_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.game_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

alter table public.review_likes enable row level security;

create policy "Review likes are viewable by everyone"
  on public.review_likes for select using (true);

create policy "Users can manage their own likes"
  on public.review_likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Comments on reviews
create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.game_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.review_comments enable row level security;

create policy "Review comments are viewable by everyone"
  on public.review_comments for select using (true);

create policy "Users can manage their own comments"
  on public.review_comments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications (recipient-facing activity: follows, likes, comments)
create type public.notification_type as enum ('follow', 'like', 'comment');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, -- recipient
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  entry_id uuid references public.game_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on public.notifications for insert to authenticated with check (true);

-- Auto-create notification when someone follows a user
create function public.handle_new_follow()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_follow_created
  after insert on public.follows
  for each row execute procedure public.handle_new_follow();

-- Auto-create notification when someone likes a review
create function public.handle_new_review_like()
returns trigger as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.game_entries where id = new.entry_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entry_id)
    values (owner_id, new.user_id, 'like', new.entry_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_like_created
  after insert on public.review_likes
  for each row execute procedure public.handle_new_review_like();

-- Auto-create notification when someone comments on a review
create function public.handle_new_review_comment()
returns trigger as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.game_entries where id = new.entry_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entry_id)
    values (owner_id, new.user_id, 'comment', new.entry_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_comment_created
  after insert on public.review_comments
  for each row execute procedure public.handle_new_review_comment();
