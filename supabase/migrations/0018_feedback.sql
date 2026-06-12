create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_bug boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Users can create feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);
