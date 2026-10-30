import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, type Goal, type Topic, TOPIC_COLUMNS } from "@/lib/goals";
import { GoalsBoard } from "@/components/goals/GoalsBoard";
import { requestTime } from "@/lib/dates";
import { SESSION_COLUMNS, sessionDuration, type Session } from "@/lib/sessions";

export default function HedeflerPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
        <GoalsData />
      </Suspense>
    </div>
  );
}

async function GoalsData() {
  // Bugünün tarihi kullanıldığı için sayfa her istekte yeniden hesaplanır.
  await connection();
  const supabase = await createClient();
  const [goals, topics, sessions] = await Promise.all([
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase
      .from("topics")
      .select(TOPIC_COLUMNS),
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "work").not("topic_id", "is", null),
  ]);

  const error = goals.error ?? topics.error ?? sessions.error;
  if (error) {
    return <div className="card text-sm text-red-600 dark:text-red-400">Veriler yüklenemedi: {error.message}</div>;
  }

  const now = requestTime();
  const worked: Record<string, number> = {};
  for (const s of sessions.data as Session[]) {
    worked[s.topic_id!] = (worked[s.topic_id!] ?? 0) + sessionDuration(s, now);
  }

  return (
    <GoalsBoard
      goals={goals.data as Goal[]}
      topics={topics.data as Topic[]}
      today={istanbulToday()}
      now={new Date(now).toISOString()}
      worked={worked}
    />
  );
}
