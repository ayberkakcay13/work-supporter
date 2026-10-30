-- Çalışma Planlayıcı — ilk şema
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.
-- Her tabloda user_id vardır ve RLS ile sadece sahibi satırı görebilir/değiştirebilir.

-- ---------------------------------------------------------------------------
-- goals: sınav / proje / diğer hedefler
-- ---------------------------------------------------------------------------
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null default 'sınav' check (type in ('sınav', 'proje', 'diğer')),
  title       text not null,
  course_code text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  location    text,
  color       text not null default '#6366f1',
  notes       text,
  created_at  timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- topics: hedef altındaki konular ve alt başlıklar (parent_id ile iç içe)
-- ---------------------------------------------------------------------------
create table public.topics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id      uuid not null references public.goals (id) on delete cascade,
  parent_id    uuid references public.topics (id) on delete cascade,
  title        text not null,
  due_date     date,
  completed_at timestamptz,
  miss_note    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index topics_user_idx on public.topics (user_id);
create index topics_goal_idx on public.topics (goal_id);
create index topics_parent_idx on public.topics (parent_id);

-- ---------------------------------------------------------------------------
-- plans: takvimdeki çalışma planları
-- ---------------------------------------------------------------------------
create table public.plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id    uuid references public.goals (id) on delete set null,
  topic_id   uuid references public.topics (id) on delete set null,
  title      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index plans_user_time_idx on public.plans (user_id, starts_at);

-- ---------------------------------------------------------------------------
-- todos: günlük / haftalık / aylık yapılacaklar
-- period_start: günün tarihi, haftanın pazartesisi ya da ayın 1'i
-- ---------------------------------------------------------------------------
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  scope        text not null check (scope in ('day', 'week', 'month')),
  period_start date not null,
  done_at      timestamptz,
  goal_id      uuid references public.goals (id) on delete set null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index todos_user_period_idx on public.todos (user_id, scope, period_start);

-- ---------------------------------------------------------------------------
-- sessions: sayaç oturumları. Açık oturum = ended_at IS NULL
-- ---------------------------------------------------------------------------
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind            text not null check (kind in ('work', 'break')),
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  planned_minutes integer check (planned_minutes > 0),
  goal_id         uuid references public.goals (id) on delete set null,
  topic_id        uuid references public.topics (id) on delete set null,
  check (ended_at is null or ended_at >= started_at)
);
create index sessions_user_time_idx on public.sessions (user_id, started_at);
-- Aynı anda en fazla bir açık oturum
create unique index sessions_one_open_idx on public.sessions (user_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- reviews: haftalık / aylık özetin görüldüğü kayıt
-- ---------------------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_type  text not null check (period_type in ('week', 'month')),
  period_start date not null,
  seen_at      timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

-- ---------------------------------------------------------------------------
-- settings: kullanıcı başına tek satır
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme             text not null default 'auto' check (theme in ('light', 'dark', 'auto')),
  default_work_min  integer not null default 25 check (default_work_min > 0),
  default_break_min integer not null default 10 check (default_break_min > 0),
  sound_enabled     boolean not null default true
);

-- ---------------------------------------------------------------------------
-- RLS: sadece sahibi
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['goals', 'topics', 'plans', 'todos', 'sessions', 'reviews', 'settings']
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
