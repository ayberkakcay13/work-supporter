-- Haftalık plan tahtası (Hedefler > Plan sekmesi).
-- courses: elle eklenen ders kartları. Hedeflerdeki ders kodları otomatik kart olur;
--          aynı kodla bir satır varsa adı/rengi onun yerine geçer.
-- week_cards: güne bırakılmış kartlar. Saat isteğe bağlıdır; sıra sort_order ile tutulur.
-- Planları, süreleri ya da istatistikleri etkilemez.
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.

create table public.courses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code       text not null,
  name       text,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create table public.week_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  course_code text not null,
  topic       text,
  time        text check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  sort_order  double precision not null default 0,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index week_cards_user_day_idx on public.week_cards (user_id, day);

do $$
declare
  t text;
begin
  foreach t in array array['courses', 'week_cards']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "sahibi okur" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "sahibi ekler" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "sahibi günceller" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "sahibi siler" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end
$$;
