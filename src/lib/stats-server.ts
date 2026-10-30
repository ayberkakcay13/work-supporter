import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Goal, Topic } from "@/lib/goals";
import { SESSION_COLUMNS, type Session } from "@/lib/sessions";

// İstatistik ve özetler için gereken tüm veriler (tek kullanıcı, veri küçük).
export async function fetchStatsData() {
  const supabase = await createClient();
  const [sessions, topics, goals] = await Promise.all([
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "work").order("started_at"),
    supabase
      .from("topics")
      .select("id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at"),
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .order("starts_at", { ascending: true, nullsFirst: false }),
  ]);

  if (sessions.error || topics.error || goals.error) {
    return { error: (sessions.error ?? topics.error ?? goals.error)!.message } as const;
  }
  return {
    sessions: sessions.data as Session[],
    topics: topics.data as Topic[],
    goals: goals.data as Goal[],
  } as const;
}
