import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, localInputToIso } from "@/lib/goals";
import { PLAN_COLUMNS, planDuration, type Plan } from "@/lib/plans";
import { TodayHeader } from "@/components/TodayHeader";
import { TodayPlans, WeekPlans, type PlanGoal } from "@/components/TodayPlans";
import { WeekProgressChart, type DayProgress } from "@/components/stats/WeekProgressChart";
import { periodLabel, periodStart, shiftPeriod } from "@/lib/todos";
import { formatInTimeZone, requestTime } from "@/lib/dates";
import { SESSION_COLUMNS, workTotal, type Session } from "@/lib/sessions";
import { dayStartMs, planVsWork } from "@/lib/stats";
import { CourseList, CourseRing } from "@/components/stats/CourseProgress";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <TodayHeader />
      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense
          fallback={
            <section className="card lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold">Bugünün planları</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>
            </section>
          }
        >
          <HomeData />
        </Suspense>
      </div>
    </div>
  );
}

// Bugünün ve haftanın planları (solda) ile planlanan / çalışılan süre (sağda).
async function HomeData() {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const today = istanbulToday();
  const weekStart = periodStart("week", today);
  const weekEnd = shiftPeriod("week", weekStart, 1);
  const from = localInputToIso(`${weekStart}T00:00`)!;
  const to = localInputToIso(`${weekEnd}T00:00`)!;
  const now = requestTime();

  const supabase = await createClient();
  const [plans, goals, open, sessions] = await Promise.all([
    supabase.from("plans").select(PLAN_COLUMNS).lt("starts_at", to).gt("ends_at", from).order("starts_at"),
    supabase
      .from("goals")
      .select("id, title, course_code, color, starts_at, ends_at")
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase.from("sessions").select(SESSION_COLUMNS).is("ended_at", null).maybeSingle<Session>(),
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "work").gte("started_at", from),
  ]);

  if (plans.error || goals.error || open.error || sessions.error) {
    const message = (plans.error ?? goals.error ?? open.error ?? sessions.error)!.message;
    return <section className="card text-sm text-red-600 dark:text-red-400 lg:col-span-3">Yüklenemedi: {message}</section>;
  }

  const allGoals: PlanGoal[] = goals.data.map(({ id, title, color }) => ({ id, title, color }));
  // Plan eklerken sadece bitmemiş hedefler seçilebilir.
  const activeGoals = allGoals.filter((_, i) => {
    const g = goals.data[i];
    const end = g.ends_at ?? g.starts_at;
    return !end || Date.parse(end) >= now;
  });

  const dayOf = (iso: string) => formatInTimeZone(new Date(iso), "yyyy-MM-dd");
  const all = plans.data as Plan[];
  const work = sessions.data as Session[];
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftPeriod("day", weekStart, i));
  const plansOn = (day: string) => all.filter((p) => dayOf(p.starts_at) === day);
  const plannedOn = (day: string) => plansOn(day).reduce((sum, p) => sum + planDuration(p), 0);
  const workedOn = (day: string) => workTotal(work, dayStartMs(day), dayStartMs(shiftPeriod("day", day, 1)), now);

  const progress: DayProgress[] = weekDays.map((d) => ({
    label: format(parseISO(d), "EEE", { locale: tr }),
    detail: format(parseISO(d), "d MMMM EEEE", { locale: tr }),
    plannedMs: plannedOn(d),
    workedMs: workedOn(d),
  }));
  // Ders bazlı planlanan / çalışılan (bugün ve bu hafta).
  const todayCourses = planVsWork(plansOn(today), work, goals.data, dayStartMs(today), dayStartMs(shiftPeriod("day", today, 1)), now);
  const weekCourses = planVsWork(all, work, goals.data, dayStartMs(weekStart), dayStartMs(weekEnd), now);

  const otherDays = weekDays
    .filter((d) => d !== today)
    .map((d) => ({ day: d, isPast: d < today, plans: plansOn(d) }));

  return (
    <>
      <div className="space-y-4 lg:col-span-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Bugünün planları</h2>
            <Link href="/gun-plani" className="btn-secondary px-3 py-1.5 text-xs">
              🗓 Gün planı
            </Link>
          </div>
          <TodayPlans
            plans={plansOn(today)}
            goals={allGoals}
            activeGoals={activeGoals}
            today={today}
            hasOpenSession={!!open.data}
          />
        </section>
        <section className="card">
          <h2 className="mb-3 font-medium">
            Bu haftanın planları{" "}
            <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">· {periodLabel("week", weekStart)}</span>
          </h2>
          <WeekPlans days={otherDays} goals={allGoals} activeGoals={activeGoals} />
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card space-y-4">
          <h2 className="font-medium">Bugün</h2>
          <div className="flex flex-wrap items-center gap-5">
            <CourseRing items={todayCourses} size={150} />
            <div className="min-w-48 flex-1">
              <CourseList items={todayCourses} />
            </div>
          </div>
        </section>
        <section className="card space-y-4">
          <h2 className="font-medium">Bu hafta</h2>
          <div className="flex flex-wrap items-center gap-5">
            <CourseRing items={weekCourses} size={150} />
            <div className="min-w-48 flex-1">
              <CourseList items={weekCourses} />
            </div>
          </div>
          <WeekProgressChart data={progress} />
        </section>
      </aside>
    </>
  );
}
