"use client";

import { createClient } from "@/lib/supabase/client";

// Telefon kilitliyken de sayaç alarmı gelsin diye Web Push aboneliği.
// Bildirimleri sunucu (Supabase cron + Edge Function "session-alarm") gönderir; service worker gösterir.

export type PushStatus = "unsupported" | "denied" | "off" | "on";

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

let registration: Promise<ServiceWorkerRegistration> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (!supported()) return null;
  registration ??= navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return registration;
}

export async function pushStatus(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

// "BASE64URL" açık anahtarı, pushManager.subscribe'ın beklediği byte dizisine çevirir.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// İzin verilmişse aboneliği oluşturur (yoksa) ve veritabanına yazar. Hata mesajı ya da null döner.
export async function enablePush(): Promise<string | null> {
  if (!supported()) return "Bu tarayıcı bildirimleri desteklemiyor.";
  const permission =
    Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return "Bildirim izni verilmedi.";

  const supabase = createClient();
  const reg = await registerServiceWorker()!;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { data: key, error } = await supabase.rpc("vapid_public_key");
    if (error || !key) return "Bildirim sunucusu henüz hazır değil, biraz sonra tekrar dene.";
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key as string) });
  }

  const json = sub.toJSON();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return "Giriş yapılmamış.";
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: data.session.user.id, endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
    { onConflict: "endpoint" },
  );
  return error?.message ?? null;
}

export async function disablePush(): Promise<string | null> {
  if (!supported()) return null;
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const { error } = await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
  return error?.message ?? null;
}
