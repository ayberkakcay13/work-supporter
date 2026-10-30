import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday, localInputToIso } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { formatInTimeZone, requestTime } from "@/lib/dates";
import { DayPlanner, type DaySlot } from "@/components/DayPlanner";

type SearchParams = Promise<{ tarih?: string }>;

export default function GunPlaniPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
      <DayPlanData searchParams={searchParams} />
    </Suspense>
  );
}

async function DayPlanData({ searchParams }: { searchParams: SearchParams }) {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const params = await searchParams;
  const today = istanbulToday();
  const day = params.tarih && /^\d{4}-\d{2}-\d{2}$/.test(params.tarih) ? params.tarih : today;
  const from = localInputToIso(`${day}T00:00`)!;
  const to = new Date(Date.parse(from) + 86_400_000).toISOString();

  const supabase = await createClient();
  const [plans, goals, slots] = await Promise.all([
    supabase.from("plans").select(PLAN_COLUMNS).gte("starts_at", from).lt("starts_at", to).order("starts_at"),
    supabase.from("goals").select("id, title, color"),
    supabase.from("day_slots").select("hour, plan_id, note").eq("day", day),
  ]);

  if (plans.error || goals.error || slots.error) {
    const message = (plans.error ?? goals.error ?? slots.error)!.message;
    return <div className="card text-sm text-red-600 dark:text-red-400">Yüklenemedi: {message}</div>;
  }

  const now = requestTime();
  return (
    <DayPlanner
      key={day}
      day={day}
      today={today}
      currentHour={day === today ? Number(formatInTimeZone(new Date(now), "H")) : null}
      plans={plans.data as Plan[]}
      goals={goals.data}
      initialSlots={slots.data as DaySlot[]}
    />
  );
}
