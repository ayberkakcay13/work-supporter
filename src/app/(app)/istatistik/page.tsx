import { Suspense } from "react";
import { connection } from "next/server";
import { istanbulToday } from "@/lib/goals";
import { requestTime } from "@/lib/dates";
import { fetchStatsData } from "@/lib/stats-server";
import { StatsBoard } from "@/components/stats/StatsBoard";

export default function IstatistikPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">İstatistik</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
        <StatsData />
      </Suspense>
    </div>
  );
}

async function StatsData() {
  // Bugünün tarihi kullanıldığı için her istekte yeniden hesaplanır.
  await connection();
  const data = await fetchStatsData();
  if ("error" in data) {
    return <div className="card text-sm text-red-600 dark:text-red-400">Yüklenemedi: {data.error}</div>;
  }
  return (
    <StatsBoard
      sessions={data.sessions}
      topics={data.topics}
      goals={data.goals}
      today={istanbulToday()}
      now={requestTime()}
    />
  );
}
