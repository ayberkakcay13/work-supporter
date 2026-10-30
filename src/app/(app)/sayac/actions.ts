"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action";
import { plannedEnd, SESSION_COLUMNS, type Session, type SessionKind } from "@/lib/sessions";

// RLS zaten sadece sahibine izin verir; burada giriş yapılmış olmasını da kontrol ediyoruz.
async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Giriş yapılmamış");
  return supabase;
}

type Supabase = Awaited<ReturnType<typeof authed>>;

const validMinutes = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 600;

// Açık oturumu kapatır. Sabit süreli oturum, süre dolduysa planlanan bitişte kapanır.
async function closeOpen(supabase: Supabase, id?: string) {
  let query = supabase.from("sessions").select(SESSION_COLUMNS).is("ended_at", null);
  if (id) query = query.eq("id", id);
  const { data, error } = await query.maybeSingle<Session>();
  if (error || !data) return error;

  const now = Date.now();
  const end = Math.min(now, plannedEnd(data) ?? now);
  const { error: updateError } = await supabase
    .from("sessions")
    .update({ ended_at: new Date(end).toISOString() })
    .eq("id", data.id);
  return updateError;
}

export async function startSession(
  kind: SessionKind,
  plannedMinutes: number | null,
  goalId: string | null,
  topicId: string | null,
  // Son kullanılan süreler bir dahaki sefere hazır gelsin diye ayarlara yazılır.
  remember?: { work: number | null; break: number | null },
): Promise<ActionResult> {
  if (plannedMinutes !== null && !validMinutes(plannedMinutes)) {
    return { error: "Süre 1–600 dakika arasında olmalı." };
  }
  const supabase = await authed();

  // Aynı anda tek açık oturum olabilir; varsa önce kapatılır.
  const closeError = await closeOpen(supabase);
  if (closeError) return { error: closeError.message };

  const { error } = await supabase.from("sessions").insert({
    kind,
    started_at: new Date().toISOString(),
    planned_minutes: plannedMinutes,
    goal_id: kind === "work" ? goalId : null,
    topic_id: kind === "work" ? topicId : null,
  });
  if (error) return { error: error.message };

  const work = validMinutes(remember?.work) ? remember!.work : null;
  const brk = validMinutes(remember?.break) ? remember!.break : null;
  if (work || brk) {
    const { data } = await supabase.auth.getUser();
    await supabase.from("settings").upsert({
      user_id: data.user!.id,
      ...(work ? { default_work_min: work } : {}),
      ...(brk ? { default_break_min: brk } : {}),
    });
  }

  refresh();
  return {};
}

export async function endSession(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const error = await closeOpen(supabase, id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
