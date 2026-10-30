-- Gün planında saate elle yazılan not (ör. "Yemek", "Spor"). Bir saat ya bir plan ya da bir not tutar.
-- Supabase > SQL Editor'a yapıştırıp çalıştırın.

alter table public.day_slots alter column plan_id drop not null;
alter table public.day_slots add column note text check (char_length(note) <= 80);
alter table public.day_slots add constraint day_slots_plan_or_note
  check ((plan_id is not null) <> (note is not null));
