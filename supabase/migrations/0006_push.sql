-- Sayaç süresi dolunca telefon kilitliyken de bildirim gelsin diye Web Push.
-- Akış: pg_cron (15 sn) -> süresi dolmuş açık oturum varsa Edge Function "session-alarm"
--       -> close_due_sessions() oturumları kapatır -> abonelere push gönderilir.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- push_subscriptions: tarayıcı/telefon push abonelikleri
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "sahibi okur" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "sahibi ekler" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sahibi günceller" on public.push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sahibi siler" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Gizli değerler Vault'ta: cron -> Edge Function çağrı anahtarı (rastgele üretilir).
-- VAPID anahtarlarını Edge Function ilk çalışmada kendisi üretip buraya yazar.
-- ---------------------------------------------------------------------------
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'session_alarm_secret');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.vault_secret(p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name
$$;

create function private.check_alarm_secret(p_secret text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or p_secret is distinct from private.vault_secret('session_alarm_secret') then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;
end
$$;

-- Süresi dolmuş açık oturumları planlanan bitişte kapatır ve döner (tek UPDATE: aynı oturuma iki bildirim gitmez).
create function public.close_due_sessions(p_secret text)
returns table (id uuid, user_id uuid, kind text)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_alarm_secret(p_secret);
  return query
    update public.sessions s
       set ended_at = s.started_at + make_interval(mins => s.planned_minutes)
     where s.ended_at is null
       and s.planned_minutes is not null
       and s.started_at + make_interval(mins => s.planned_minutes) <= now()
    returning s.id, s.user_id, s.kind;
end
$$;

-- VAPID anahtarları (Edge Function okur / ilk seferde yazar).
create function public.alarm_vapid_keys(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  pub text;
  priv text;
begin
  perform private.check_alarm_secret(p_secret);
  pub := private.vault_secret('vapid_public_key');
  priv := private.vault_secret('vapid_private_key');
  if pub is null or priv is null then
    return null;
  end if;
  return jsonb_build_object('public', pub, 'private', priv);
end
$$;

create function public.alarm_store_vapid_keys(p_secret text, p_public text, p_private text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_alarm_secret(p_secret);
  if private.vault_secret('vapid_public_key') is not null then
    return;
  end if;
  perform vault.create_secret(p_public, 'vapid_public_key');
  perform vault.create_secret(p_private, 'vapid_private_key');
end
$$;

-- Tarayıcının abone olurken kullandığı açık anahtar (gizli değil).
create function public.vapid_public_key() returns text
language sql stable security definer set search_path = '' as $$
  select private.vault_secret('vapid_public_key')
$$;

revoke execute on function public.close_due_sessions(text) from public, anon, authenticated;
revoke execute on function public.alarm_vapid_keys(text) from public, anon, authenticated;
revoke execute on function public.alarm_store_vapid_keys(text, text, text) from public, anon, authenticated;
grant execute on function public.close_due_sessions(text) to service_role;
grant execute on function public.alarm_vapid_keys(text) to service_role;
grant execute on function public.alarm_store_vapid_keys(text, text, text) to service_role;
revoke execute on function public.vapid_public_key() from public, anon;
grant execute on function public.vapid_public_key() to authenticated;

-- ---------------------------------------------------------------------------
-- Zamanlayıcı: 15 sn'de bir. Sadece süresi dolmuş oturum varsa (ya da VAPID anahtarı
-- henüz üretilmemişse) Edge Function çağrılır; boşta iken HTTP isteği yok.
-- ---------------------------------------------------------------------------
create function private.trigger_session_alarm() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
       select 1 from public.sessions s
        where s.ended_at is null
          and s.planned_minutes is not null
          and s.started_at + make_interval(mins => s.planned_minutes) <= now()
     )
     or private.vault_secret('vapid_public_key') is null then
    perform net.http_post(
      url := 'https://sszermtphxpzepbbyodv.supabase.co/functions/v1/session-alarm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-alarm-secret', private.vault_secret('session_alarm_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  end if;
end
$$;

select cron.schedule('session-alarm', '15 seconds', 'select private.trigger_session_alarm()');
