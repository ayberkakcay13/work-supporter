-- Saatsiz planlar: "bugün 2 saat çalışacağım" gibi sadece gün ve süresi olan planlar.
-- Bu planlarda starts_at günün başı (İstanbul 00:00), ends_at = starts_at + süre olarak tutulur.
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.

alter table public.plans add column untimed boolean not null default false;
