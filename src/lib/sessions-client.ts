"use client";

import { createClient } from "@/lib/supabase/client";
import { plannedEnd, SESSION_COLUMNS, type Session, type SessionKind } from "@/lib/sessions";

// Sayaç işlemleri doğrudan tarayıcıdaki Supabase istemcisiyle yapılır (RLS sahibini korur).
// Sunucu eylemi + sayfayı yeniden çizdirme yok; ekran iyimser güncellenir, kayıt arka planda gider.

export const validMinutes = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 600;

// Ekranda hemen gösterilecek yeni oturum. Zaman ve id tarayıcıda üretilir.
export function newSession(
  kind: SessionKind,
  plannedMinutes: number | null,
  goalId: string | null,
  topicId: string | null,
): Session {
  return {
    id: crypto.randomUUID(),
    kind,
    started_at: new Date().toISOString(),
    ended_at: null,
    planned_minutes: plannedMinutes,
    goal_id: kind === "work" ? goalId : null,
    topic_id: kind === "work" ? topicId : null,
  };
}

// Sabit süreli oturum, süre dolduysa planlanan bitişte kapanır.
export function endTime(s: Session, at: number): string {
  return new Date(Math.min(at, plannedEnd(s) ?? at)).toISOString();
}

// Oturumu kaydeder. Normalde tek istek (insert); başka sekmeden kalmış açık oturum
// yüzünden tekil indeks hatası gelirse o oturum kapatılıp bir kez daha denenir.
export async function saveSession(
  s: Session,
  remember?: { work: number | null; break: number | null },
): Promise<string | null> {
  const supabase = createClient();
  const row = {
    id: s.id,
    kind: s.kind,
    started_at: s.started_at,
    planned_minutes: s.planned_minutes,
    goal_id: s.goal_id,
    topic_id: s.topic_id,
  };

  const work = validMinutes(remember?.work) ? remember!.work : null;
  const brk = validMinutes(remember?.break) ? remember!.break : null;
  // Son kullanılan süreler ayarlara paralel yazılır. getSession ağa gitmez, yerel oturumu okur.
  const userId = work || brk ? (await supabase.auth.getSession()).data.session?.user.id : undefined;
  // Supabase sorguları tembeldir; .then ile hemen gönderilir, insert ile aynı anda gider.
  const settings = userId
    ? supabase
        .from("settings")
        .upsert({
          user_id: userId,
          ...(work ? { default_work_min: work } : {}),
          ...(brk ? { default_break_min: brk } : {}),
        })
        .then(() => undefined)
    : null;

  let { error } = await supabase.from("sessions").insert(row);
  if (error?.code === "23505") {
    const { data: stale } = await supabase
      .from("sessions")
      .select(SESSION_COLUMNS)
      .is("ended_at", null)
      .maybeSingle<Session>();
    if (stale) {
      await supabase
        .from("sessions")
        .update({ ended_at: endTime(stale, Date.parse(s.started_at)) })
        .eq("id", stale.id);
    }
    ({ error } = await supabase.from("sessions").insert(row));
  }
  await settings;
  return error?.message ?? null;
}

export async function saveSessionEnd(id: string, endedAt: string): Promise<string | null> {
  const { error } = await createClient().from("sessions").update({ ended_at: endedAt }).eq("id", id).is("ended_at", null);
  return error?.message ?? null;
}

export async function removeSession(id: string): Promise<string | null> {
  const { error } = await createClient().from("sessions").delete().eq("id", id);
  return error?.message ?? null;
}
