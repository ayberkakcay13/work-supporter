-- Konu / alt başlık için çalışılacak süre (dakika). Boş bırakılabilir.
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.

alter table public.topics add column planned_minutes integer check (planned_minutes > 0);
