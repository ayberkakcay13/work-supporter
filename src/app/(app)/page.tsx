import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, localInputToIso } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { TodayHeader } from "@/components/TodayHeader";
import { TodayPlans } from "@/components/TodayPlans";
import { TodoList } from "@/components/todos/TodoList";
import { fetchTodoData } from "@/lib/todos-server";
import { periodStart } from "@/lib/todos";
import { requestTime } from "@/lib/dates";
import { formatTotal, SESSION_COLUMNS, workTotal, type Session } from "@/lib/sessions";
import { TimerShortcut } from "@/components/timer/TimerShortcut";

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
          <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
            <TimerShortcutData />
          </Suspense>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Çalışma süresi</h2>
          <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
            <StudyTotals />
          </Suspense>
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

async function TimerShortcutData() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select(SESSION_COLUMNS).is("ended_at", null).maybeSingle<Session>();
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">Yüklenemedi: {error.message}</p>;
  return <TimerShortcut key={data?.id ?? "bos"} open={data} serverNow={requestTime()} />;
}

async function StudyTotals() {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const today = istanbulToday();
  const dayStart = Date.parse(localInputToIso(`${today}T00:00`)!);
  const weekStart = Date.parse(localInputToIso(`${periodStart("week", today)}T00:00`)!);
  const now = requestTime();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("kind", "work")
    .gte("started_at", new Date(weekStart).toISOString());
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">Yüklenemedi: {error.message}</p>;

  const sessions = data as Session[];
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Bugün</p>
        <p className="text-2xl font-semibold tabular-nums">{formatTotal(workTotal(sessions, dayStart, now, now))}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Bu hafta</p>
        <p className="text-2xl font-semibold tabular-nums">{formatTotal(workTotal(sessions, weekStart, now, now))}</p>
      </div>
    </div>
  );
}
