import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { istanbulToday } from "@/lib/goals";
import { requestTime } from "@/lib/dates";
import { hasActivity, summarizePeriod, type PeriodSummary, type ReviewPeriod } from "@/lib/stats";
import { fetchStatsData } from "@/lib/stats-server";
import { periodStart, shiftPeriod } from "@/lib/todos";
import { ReviewModal } from "./ReviewModal";

// Biten son hafta ve ay için özet henüz görülmediyse modal olarak gösterir.
export async function ReviewGate() {
  await connection();
  const today = istanbulToday();
  const candidates = (["week", "month"] as ReviewPeriod[]).map((type) => ({
    type,
    start: shiftPeriod(type, periodStart(type, today), -1),
  }));

  const supabase = await createClient();
  const { data: seen, error } = await supabase
    .from("reviews")
    .select("period_type, period_start")
    .in("period_start", candidates.map((c) => c.start));
  if (error) return null;

  const pending = candidates.filter(
    (c) => !seen.some((r) => r.period_type === c.type && r.period_start === c.start),
  );
  if (pending.length === 0) return null;

  const data = await fetchStatsData();
  if ("error" in data) return null;

  const now = requestTime();
  // Hiç verisi olmayan dönem (ör. uygulamayı kullanmaya başlamadan önceki hafta) gösterilmez.
  const summaries: PeriodSummary[] = pending
    .map((c) => summarizePeriod(c.type, c.start, data, today, now))
    .filter(hasActivity);

  return summaries.length > 0 ? <ReviewModal summaries={summaries} /> : null;
}
