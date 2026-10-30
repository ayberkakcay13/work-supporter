"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTotal } from "@/lib/sessions";

export type ChartPoint = { label: string; detail: string; ms: number };

const HOUR = 3_600_000;

// Tek seri çalışma süresi sütun grafiği (lejant yok; başlık ne gösterildiğini söyler).
export function WorkChart({ data }: { data: ChartPoint[] }) {
  const maxHours = Math.max(1, Math.ceil(Math.max(...data.map((d) => d.ms)) / HOUR));
  const points = data.map((d) => ({ ...d, hours: d.ms / HOUR }));

  return (
    <div className="chart h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
              const point = active && payload?.[0]?.payload as (ChartPoint & { hours: number }) | undefined;
              if (!point) return null;
              return (
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-zinc-500 dark:text-zinc-400">{point.detail}</p>
                  <p className="font-semibold">{formatTotal(point.ms)}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
