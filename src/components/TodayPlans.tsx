"use client";

import Link from "next/link";
import { formatInTimeZone } from "@/lib/dates";
import { DEFAULT_PLAN_COLOR, type Plan } from "@/lib/plans";
import { setPlanDone } from "@/app/(app)/takvim/actions";
import { useAction } from "@/components/useAction";

export function TodayPlans({ plans, colors }: { plans: Plan[]; colors: Record<string, string> }) {
  const { pending, error, run } = useAction();

  if (plans.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Bugün için plan yok.{" "}
        <Link href="/takvim" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Takvimden ekle
        </Link>
      </p>
    );
  }

  const time = (iso: string) => formatInTimeZone(new Date(iso), "HH:mm");

  return (
    <ul className="space-y-1">
      {plans.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-lg px-1 py-1">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-indigo-600"
            checked={p.done}
            disabled={pending}
            onChange={(e) => run(() => setPlanDone(p.id, e.target.checked))}
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: (p.goal_id && colors[p.goal_id]) || DEFAULT_PLAN_COLOR }}
          />
          <span className="w-24 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {time(p.starts_at)}–{time(p.ends_at)}
          </span>
          <span className={p.done ? "text-zinc-400 line-through dark:text-zinc-500" : ""}>{p.title}</span>
        </li>
      ))}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </ul>
  );
}
