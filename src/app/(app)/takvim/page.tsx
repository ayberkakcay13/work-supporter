import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Goal, Topic } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";

export default function TakvimPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Takvim</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
        <CalendarData />
      </Suspense>
    </div>
  );
}

async function CalendarData() {
  // Takvim "bugün"ü kullandığı için sayfa her istekte yeniden hesaplanır.
  await connection();
  const supabase = await createClient();
  const [goals, topics, plans] = await Promise.all([
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("topics")
      .select("id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at"),
    supabase.from("plans").select(PLAN_COLUMNS),
  ]);

  const error = goals.error ?? topics.error ?? plans.error;
  if (error) {
    return <div className="card text-sm text-red-600 dark:text-red-400">Veriler yüklenemedi: {error.message}</div>;
  }

  return <CalendarBoard goals={goals.data as Goal[]} topics={topics.data as Topic[]} plans={plans.data as Plan[]} />;
}
