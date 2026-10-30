import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, type Goal, type Topic } from "@/lib/goals";
import { GoalsBoard } from "@/components/goals/GoalsBoard";

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
  const [goals, topics] = await Promise.all([
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase
      .from("topics")
      .select("id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at"),
  ]);

  const error = goals.error ?? topics.error;
  if (error) {
    return <div className="card text-sm text-red-600 dark:text-red-400">Veriler yüklenemedi: {error.message}</div>;
  }

  return (
    <GoalsBoard
      goals={goals.data as Goal[]}
      topics={topics.data as Topic[]}
      today={istanbulToday()}
      now={new Date().toISOString()}
    />
  );
}
