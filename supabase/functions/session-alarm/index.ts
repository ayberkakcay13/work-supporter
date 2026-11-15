// Sayaç alarmı: pg_cron her 15 sn'de (sadece gerekirse) çağırır.
// Süresi dolmuş açık oturumları kapatır ve sahibinin abone olduğu cihazlara Web Push gönderir.
// Çağrı, Vault'taki rastgele anahtarla (x-alarm-secret) doğrulanır; kontrolü veritabanı fonksiyonları yapar.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const MESSAGES: Record<string, { title: string; body: string }> = {
  work: { title: "Çalışma süresi doldu", body: "Mola vermeyi unutma." },
  break: { title: "Mola bitti", body: "Hazır olduğunda yeni çalışmayı başlat." },
};

type Keys = { public: string; private: string };
type Due = { id: string; user_id: string; kind: string };
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const secret = req.headers.get("x-alarm-secret") ?? "";

  // VAPID anahtarları yoksa ilk çalışmada üretilip Vault'a yazılır.
  const { data: stored, error: keyError } = await supabase.rpc("alarm_vapid_keys", { p_secret: secret });
  if (keyError) return json({ error: "yetkisiz" }, 401);
  let keys = stored as Keys | null;
  if (!keys) {
    const generated = webpush.generateVAPIDKeys();
    const { error } = await supabase.rpc("alarm_store_vapid_keys", {
      p_secret: secret,
      p_public: generated.publicKey,
      p_private: generated.privateKey,
    });
    if (error) return json({ error: error.message }, 500);
    // Aynı anda iki çağrı olursa ilk yazılan geçerlidir; tekrar okunur.
    const { data } = await supabase.rpc("alarm_vapid_keys", { p_secret: secret });
    keys = data as Keys;
  }
  // VAPID "subject": push servisine iletilen iletişim adresi (proje adresi).
  webpush.setVapidDetails(Deno.env.get("SUPABASE_URL")!, keys.public, keys.private);

  const { data: due, error: dueError } = await supabase.rpc("close_due_sessions", { p_secret: secret });
  if (dueError) return json({ error: dueError.message }, 500);
  const sessions = (due ?? []) as Due[];
  if (sessions.length === 0) return json({ sent: 0 });

  const userIds = [...new Set(sessions.map((s) => s.user_id))];
  const { data: subs, error: subError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subError) return json({ error: subError.message }, 500);

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    sessions.flatMap((s) =>
      ((subs ?? []) as Subscription[])
        .filter((sub) => sub.user_id === s.user_id)
        .map(async (sub) => {
          const message = MESSAGES[s.kind] ?? MESSAGES.work;
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ ...message, tag: "sayac", url: "/sayac" }),
              { TTL: 600, urgency: "high" },
            );
            sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            // Abonelik artık geçersiz (uygulama kaldırıldı / izin geri alındı).
            if (status === 404 || status === 410) gone.push(sub.id);
            else console.error("push gönderilemedi", status, (e as Error).message);
          }
        }),
    ),
  );
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);

  return json({ closed: sessions.length, sent, removed: gone.length });
});
