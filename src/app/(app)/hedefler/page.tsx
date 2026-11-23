import { Suspense } from "react";
import Link from "next/link";
import { StudyMonkey } from "@/components/StudyMonkey";
import { GoalsBodySkeleton } from "@/components/Skeleton";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, type Goal, type Topic, TOPIC_COLUMNS } from "@/lib/goals";
import { GoalsBoard } from "@/components/goals/GoalsBoard";
import { WeekBoard } from "@/components/goals/WeekBoard";
import { requestTime } from "@/lib/dates";
import { SESSION_COLUMNS, sessionDuration, type Session } from "@/lib/sessions";
import { periodStart, shiftPeriod } from "@/lib/todos";
import { topicSuggestions, WEEK_CARD_COLUMNS, type CourseRow, type WeekCard } from "@/lib/week";

type SearchParams = Promise<{ sekme?: string; hafta?: string }>;

// Sekmeler: Plan (haftalık plan tahtası, varsayılan) ve Hedefler (sınav/proje → konu ağacı).
export default function HedeflerPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<><StudyMonkey /><GoalsBodySkeleton /></>}>
        <HedeflerView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Tabs({ active }: { active: "plan" | "hedefler" }) {
  const tab = (key: "plan" | "hedefler", label: string) => (
    <Link
      href={`/hedefler?sekme=${key}`}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${
        active === key
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
      {tab("plan", "Plan")}
      {tab("hedefler", "Hedefler")}
    </div>
  );
}

async function HedeflerView({ searchParams }: { searchParams: SearchParams }) {
  // Bugünün tarihi kullanıldığı için sayfa her istekte yeniden hesaplanır.
  await connection();
  const params = await searchParams;
  const active = params.sekme === "hedefler" ? "hedefler" : "plan";
  return (
    <>
      <Tabs active={active} />
      {active === "plan" ? <PlanData week={params.hafta} /> : <GoalsData />}
    </>
  );
}

async function PlanData({ week }: { week?: string }) {
  const today = istanbulToday();
  const weekStart = periodStart("week", week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const weekEnd = shiftPeriod("day", weekStart, 6);

  const supabase = await createClient();
  const [goals, topics, courses, cards] = await Promise.all([
    supabase.from("goals").select("id, title, course_code, color").order("starts_at", { ascending: true, nullsFirst: false }),
    supabase.from("topics").select("goal_id, title").order("sort_order"),
    supabase.from("courses").select("code, name, color"),
    supabase.from("week_cards").select(WEEK_CARD_COLUMNS).gte("day", weekStart).lte("day", weekEnd),
  ]);

  if (goals.error || topics.error || courses.error || cards.error) {
    const message = (goals.error ?? topics.error ?? courses.error ?? cards.error)!.message;
    return <div className="card text-sm text-red-600 dark:text-red-400">Veriler yüklenemedi: {message}</div>;
  }

  return (
    <WeekBoard
      key={weekStart}
      weekStart={weekStart}
      today={today}
      goals={goals.data}
      initialRows={courses.data as CourseRow[]}
      initialCards={cards.data as WeekCard[]}
      suggestions={topicSuggestions(goals.data, topics.data)}
    />
  );
}

async function GoalsData() {
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
