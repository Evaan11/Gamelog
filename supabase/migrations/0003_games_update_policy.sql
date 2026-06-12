create policy "Authenticated users can update games"
  on public.games for update to authenticated using (true) with check (true);
