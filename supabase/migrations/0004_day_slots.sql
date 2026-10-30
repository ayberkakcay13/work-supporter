-- Gün planı: günün planlarını 07:00–24:00 arasındaki saatlere yerleştirme taslağı.
-- Sadece görsel planlama içindir; planları, süreleri ya da istatistikleri etkilemez.
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.

create table public.day_slots (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day     date not null,
  hour    smallint not null check (hour between 7 and 23),
  plan_id uuid not null references public.plans (id) on delete cascade,
  unique (user_id, day, hour)
);
create index day_slots_user_day_idx on public.day_slots (user_id, day);

alter table public.day_slots enable row level security;
create policy "sahibi okur" on public.day_slots for select to authenticated using ((select auth.uid()) = user_id);
create policy "sahibi ekler" on public.day_slots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sahibi günceller" on public.day_slots for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sahibi siler" on public.day_slots for delete to authenticated using ((select auth.uid()) = user_id);
