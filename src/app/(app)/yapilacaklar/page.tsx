import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { istanbulToday } from "@/lib/goals";
import {
  CURRENT_LABELS,
  SCOPE_LABELS,
  SCOPE_SLUGS,
  periodLabel,
  periodStart,
  scopeFromSlug,
  shiftPeriod,
  type TodoScope,
} from "@/lib/todos";
import { fetchPeriodOverview, fetchTodoData } from "@/lib/todos-server";
import { TodoList } from "@/components/todos/TodoList";
import { PeriodOverview } from "@/components/todos/PeriodOverview";

type SearchParams = Promise<{ kapsam?: string; tarih?: string }>;

export default function YapilacaklarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Yapılacaklar</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
        <TodosView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const href = (scope: TodoScope, date?: string) =>
  `/yapilacaklar?kapsam=${SCOPE_SLUGS[scope]}${date ? `&tarih=${date}` : ""}`;

async function TodosView({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const scope = scopeFromSlug(params.kapsam);
  const today = istanbulToday();
  const day = params.tarih && /^\d{4}-\d{2}-\d{2}$/.test(params.tarih) ? params.tarih : today;
  const start = periodStart(scope, day);
  const currentStart = periodStart(scope, today);

  const [data, overview] = await Promise.all([fetchTodoData(scope, start), fetchPeriodOverview(scope, start)]);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-900" aria-label="Kapsam">
        {(Object.keys(SCOPE_LABELS) as TodoScope[]).map((s) => (
          <Link
            key={s}
            href={href(s, day === today ? undefined : day)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-center font-medium ${
              s === scope
                ? "bg-white shadow-sm dark:bg-zinc-800"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {SCOPE_LABELS[s]}
          </Link>
        ))}
      </nav>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href(scope, shiftPeriod(scope, start, -1))} className="btn-secondary px-3 py-1.5" aria-label="Önceki">
            ‹
          </Link>
          <Link href={href(scope, shiftPeriod(scope, start, 1))} className="btn-secondary px-3 py-1.5" aria-label="Sonraki">
            ›
          </Link>
          <h2 className="ml-2 font-semibold first-letter:uppercase">{periodLabel(scope, start)}</h2>
          {start !== currentStart && (
            <Link href={href(scope)} className="btn-ghost ml-auto">
              {CURRENT_LABELS[scope]}
            </Link>
          )}
        </div>

        {"error" in data ? (
          <p className="text-sm text-red-600 dark:text-red-400">Yüklenemedi: {data.error}</p>
        ) : (
          <TodoList
            todos={data.todos}
            goals={data.allGoals}
            goalOptions={data.goalOptions}
            scope={scope}
            periodStart={start}
            currentStart={currentStart}
          />
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Bu dönemde</h2>
        {"error" in overview ? (
          <p className="text-sm text-red-600 dark:text-red-400">Yüklenemedi: {overview.error}</p>
        ) : (
          <PeriodOverview
            scope={scope}
            goals={overview.goals}
            topics={overview.topics}
            plans={overview.plans}
            goalColors={"error" in data ? {} : Object.fromEntries(data.allGoals.map((g) => [g.id, g.color]))}
            today={today}
          />
        )}
      </section>
    </div>
  );
}
