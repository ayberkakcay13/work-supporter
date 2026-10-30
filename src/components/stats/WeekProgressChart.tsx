"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTotal } from "@/lib/sessions";

export type DayProgress = { label: string; detail: string; plannedMs: number; workedMs: number };

const HOUR = 3_600_000;
const PLANNED_COLOR = "#a1a1aa";
const WORKED_COLOR = "#6366f1";

// Haftanın her günü için planlanan ve çalışılan süre (iki seri, lejantlı).
export function WeekProgressChart({ data }: { data: DayProgress[] }) {
  const max = Math.max(...data.flatMap((d) => [d.plannedMs, d.workedMs]));
  const maxHours = Math.max(1, Math.ceil(max / HOUR));
  const points = data.map((d) => ({ ...d, planned: d.plannedMs / HOUR, worked: d.workedMs / HOUR }));

  return (
    <div className="chart h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
          <YAxis
            domain={[0, maxHours]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(h: number) => `${h} sa`}
          />
          <Tooltip
            cursor={{ fill: "rgba(113, 113, 122, 0.12)" }}
            content={({ active, payload }) => {
              const point = active && (payload?.[0]?.payload as DayProgress | undefined);
              if (!point) return null;
              return (
                <div className="space-y-0.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">{point.detail}</p>
                  <p>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PLANNED_COLOR }} />
                    Planlanan: <span className="font-semibold">{formatTotal(point.plannedMs)}</span>
                  </p>
                  <p>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: WORKED_COLOR }} />
                    Çalışılan: <span className="font-semibold">{formatTotal(point.workedMs)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-zinc-600 dark:text-zinc-300">{value}</span>}
          />
          <Bar name="Planlanan" dataKey="planned" fill={PLANNED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar name="Çalışılan" dataKey="worked" fill={WORKED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
