"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { topicStatus, type Goal, type Topic } from "@/lib/goals";
import { formatTotal, workTotal, type Session } from "@/lib/sessions";
import { dayStartMs, hasActivity, summarizePeriod, timeByCourse, type ReviewPeriod } from "@/lib/stats";
import { periodStart, shiftPeriod } from "@/lib/todos";
import { CourseBars } from "./CourseBars";
import { SummaryView } from "./SummaryView";
import { WorkChart, type ChartPoint } from "./WorkChart";

type Range = "week" | "month" | "all";
const RANGE_LABELS: Record<Range, string> = { week: "Bu hafta", month: "Bu ay", all: "Tümü" };

export function StatsBoard({
  sessions,
  topics,
  goals,
  today,
  now,
}: {
  sessions: Session[];
  topics: Topic[];
  goals: Goal[];
  today: string;
  now: number;
}) {
  const [chartMode, setChartMode] = useState<"days" | "weeks">("days");
  const [range, setRange] = useState<Range>("week");
  const [openSummary, setOpenSummary] = useState<string | null>(null);

  const weekStart = periodStart("week", today);
  const monthStart = periodStart("month", today);
  const total = (from: number) => workTotal(sessions, from, now, now);

  const tiles = [
    { label: "Bugün", value: total(dayStartMs(today)) },
    { label: "Bu hafta", value: total(dayStartMs(weekStart)) },
    { label: "Bu ay", value: total(dayStartMs(monthStart)) },
    { label: "Toplam", value: total(0) },
  ];

  // React Compiler hesaplamaları kendisi önbelleğe alır; elle useMemo gerekmez.
  const chartData: ChartPoint[] = (() => {
    if (chartMode === "days") {
      return Array.from({ length: 14 }, (_, i) => shiftPeriod("day", today, i - 13)).map((day) => ({
        label: format(parseISO(day), "d", { locale: tr }),
        detail: format(parseISO(day), "d MMMM EEEE", { locale: tr }),
        ms: workTotal(sessions, dayStartMs(day), dayStartMs(shiftPeriod("day", day, 1)), now),
      }));
    }
    return Array.from({ length: 12 }, (_, i) => shiftPeriod("week", weekStart, i - 11)).map((week) => ({
      label: format(parseISO(week), "d MMM", { locale: tr }),
      detail: `${format(parseISO(week), "d MMMM", { locale: tr })} haftası`,
      ms: workTotal(sessions, dayStartMs(week), dayStartMs(shiftPeriod("week", week, 1)), now),
    }));
  })();

  const rangeFrom = range === "week" ? dayStartMs(weekStart) : range === "month" ? dayStartMs(monthStart) : 0;
  const courses = timeByCourse(sessions, goals, rangeFrom, now, now);

  // Hedef başarıları: konusu olan hedefler, konu durumlarının dağılımıyla.
  const goalStats = goals
    .map((g) => {
      const statuses = topics.filter((t) => t.goal_id === g.id).map((t) => topicStatus(t, today));
      return {
        goal: g,
        total: statuses.length,
        onTime: statuses.filter((s) => s === "zamanında tamamlandı").length,
        late: statuses.filter((s) => s === "geç tamamlandı").length,
        overdue: statuses.filter((s) => s.startsWith("gecikti")).length,
        waiting: statuses.filter((s) => s === "bekliyor").length,
      };
    })
    .filter((s) => s.total > 0);

  // Geçmiş özetler: verinin başladığı dönemden bu yana biten haftalar ve aylar.
  const pastSummaries = (() => {
    const dates = [
      ...sessions.map((s) => s.started_at.slice(0, 10)),
      ...topics.flatMap((t) => (t.due_date ? [t.due_date] : [])),
    ].sort();
    if (dates.length === 0) return [];
    const first = dates[0];
    const list = [];
    for (const [type, max] of [["week", 8], ["month", 6]] as [ReviewPeriod, number][]) {
      let start = shiftPeriod(type, periodStart(type, today), -1);
      for (let i = 0; i < max && start >= periodStart(type, first); i++) {
        const summary = summarizePeriod(type, start, { sessions, topics, goals }, today, now);
        if (hasActivity(summary)) list.push(summary);
        start = shiftPeriod(type, start, -1);
      }
    }
    return list;
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{formatTotal(t.value)}</p>
          </div>
        ))}
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">
            Çalışma süresi · {chartMode === "days" ? "son 14 gün" : "son 12 hafta"}
          </h2>
          <Toggle
            options={[
              ["days", "Günlük"],
              ["weeks", "Haftalık"],
            ]}
            value={chartMode}
            onChange={setChartMode}
          />
        </div>
        <WorkChart data={chartData} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Ders bazlı dağılım</h2>
            <Toggle
              options={(Object.keys(RANGE_LABELS) as Range[]).map((r) => [r, RANGE_LABELS[r]])}
              value={range}
              onChange={setRange}
            />
          </div>
          {courses.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Bu aralıkta sayaç kaydı yok.</p>
          ) : (
            <CourseBars items={courses} />
          )}
        </section>

        <section className="card space-y-4">
          <h2 className="font-medium">Hedef başarıları</h2>
          {goalStats.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Henüz konusu olan hedef yok.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {goalStats.map((s) => (
                  <li key={s.goal.id} className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.goal.color }} />
                        <span className="truncate">{s.goal.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {s.onTime + s.late}/{s.total} bitti
                      </span>
                    </div>
                    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                      {(
                        [
                          [s.onTime, "bg-emerald-500", "zamanında"],
                          [s.late, "bg-amber-500", "geç"],
                          [s.overdue, "bg-red-500", "yetişmeyen"],
                          [s.waiting, "bg-zinc-300 dark:bg-zinc-700", "bekliyor"],
                        ] as [number, string, string][]
                      )
                        .filter(([n]) => n > 0)
                        .map(([n, color, label]) => (
                          <span key={label} className={color} style={{ flexGrow: n }} title={`${n} ${label}`} />
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                {[
                  ["bg-emerald-500", "Zamanında"],
                  ["bg-amber-500", "Geç"],
                  ["bg-red-500", "Yetişmeyen"],
                  ["bg-zinc-300 dark:bg-zinc-700", "Bekliyor"],
                ].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="font-medium">Geçmiş özetler</h2>
        {pastSummaries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Henüz biten bir hafta ya da ay yok. Hafta bitince özeti burada ve uygulamayı ilk açtığında göreceksin.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pastSummaries.map((s) => {
              const key = `${s.type}:${s.start}`;
              const isOpen = openSummary === key;
              return (
                <li key={key} className="py-2">
                  <button
                    className="flex w-full items-center justify-between gap-3 text-left text-sm"
                    onClick={() => setOpenSummary(isOpen ? null : key)}
                  >
                    <span>
                      <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {s.type === "week" ? "Hafta" : "Ay"}
                      </span>
                      <span className="first-letter:uppercase">{s.label}</span>
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTotal(s.totalMs)} · {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pt-4">
                      <SummaryView summary={s} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 ${
            value === v ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
