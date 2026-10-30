import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, localInputToIso } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { TodayHeader } from "@/components/TodayHeader";
import { TodayPlans } from "@/components/TodayPlans";
import { TodoList } from "@/components/todos/TodoList";
import { fetchTodoData } from "@/lib/todos-server";

export default function TodayPage() {
  return (
    <div className="space-y-6">
      <TodayHeader />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-medium">Bugünün planları</h2>
          <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
            <TodayPlansData />
          </Suspense>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Günlük yapılacaklar</h2>
          <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
            <TodayTodosData />
          </Suspense>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Sayaç</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sayaç 4. aşamada eklenecek.</p>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Çalışma süresi</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bugün / bu hafta toplamları 4. aşamada gelecek.</p>
        </section>
      </div>
    </div>
  );
}

async function TodayPlansData() {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const today = istanbulToday();
  const dayStart = localInputToIso(`${today}T00:00`)!;
  const dayEnd = new Date(Date.parse(dayStart) + 86_400_000).toISOString();

  const supabase = await createClient();
  const [plans, goals] = await Promise.all([
    supabase
      .from("plans")
      .select(PLAN_COLUMNS)
      .lt("starts_at", dayEnd)
      .gt("ends_at", dayStart)
      .order("starts_at"),
    supabase.from("goals").select("id, color"),
  ]);

  if (plans.error || goals.error) {
    const message = (plans.error ?? goals.error)!.message;
    return <p className="text-sm text-red-600 dark:text-red-400">Planlar yüklenemedi: {message}</p>;
  }

  const colors = Object.fromEntries(goals.data.map((g) => [g.id, g.color]));
  return <TodayPlans plans={plans.data as Plan[]} colors={colors} />;
}

async function TodayTodosData() {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const today = istanbulToday();
  const data = await fetchTodoData("day", today);
  if ("error" in data) return <p className="text-sm text-red-600 dark:text-red-400">Yüklenemedi: {data.error}</p>;

  return (
    <TodoList
      todos={data.todos}
      goals={data.allGoals}
      goalOptions={data.goalOptions}
      scope="day"
      periodStart={today}
      currentStart={today}
    />
  );
}
