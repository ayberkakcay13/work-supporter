import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TOPIC_COLUMNS, type Goal, type Topic } from "@/lib/goals";
import { SESSION_COLUMNS, type Session } from "@/lib/sessions";

// İstatistik ve özetler için gereken tüm veriler (tek kullanıcı, veri küçük).
export async function fetchStatsData() {
  const supabase = await createClient();
  const [sessions, topics, goals] = await Promise.all([
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "work").order("started_at"),
    supabase
      .from("topics")
      .select(TOPIC_COLUMNS),
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
