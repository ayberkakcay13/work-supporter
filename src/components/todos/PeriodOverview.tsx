import Link from "next/link";
import { formatInTimeZone } from "@/lib/dates";
import { STATUS_STYLES, topicStatus, type Goal, type Topic } from "@/lib/goals";
import { DEFAULT_PLAN_COLOR, type Plan } from "@/lib/plans";
import type { TodoScope } from "@/lib/todos";

const GOAL_ICONS = { sınav: "📝", proje: "📁", diğer: "🎯" } as const;

// Dönem içindeki sınavlar, konu teslimleri ve planlar (salt okunur özet).
export function PeriodOverview({
  scope,
  goals,
  topics,
  plans,
  goalColors,
  today,
}: {
  scope: TodoScope;
  goals: Goal[];
  topics: Topic[];
  plans: Plan[];
  goalColors: Record<string, string>;
  today: string;
}) {
  if (goals.length + topics.length + plans.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Bu dönemde sınav, konu teslimi ya da plan yok.</p>;
  }

  // Günlük görünümde tarih tekrar yazılmaz, sadece saat.
  const when = (iso: string) => formatInTimeZone(new Date(iso), scope === "day" ? "HH:mm" : "d MMM EEE, HH:mm");
  const dueDay = (date: string) => formatInTimeZone(new Date(`${date}T12:00:00+03:00`), "d MMM EEE");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {goals.length > 0 && (
        <Section title="Sınav ve projeler" href="/hedefler">
          {goals.map((g) => (
            <li key={g.id} className="flex gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
              <div className="min-w-0">
                <p className="font-medium">
                  {GOAL_ICONS[g.type]} {g.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {[when(g.starts_at!), g.location].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </Section>
      )}

      {topics.length > 0 && (
        <Section title="Konu teslimleri" href="/hedefler">
          {topics.map((t) => {
            const status = topicStatus(t, today);
            return (
              <li key={t.id} className="flex gap-2">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: goalColors[t.goal_id] ?? DEFAULT_PLAN_COLOR }}
                />
                <div className="min-w-0">
                  <p className={t.completed_at ? "text-zinc-400 line-through dark:text-zinc-500" : ""}>{t.title}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {scope !== "day" && dueDay(t.due_date!)}
                    <span className={`rounded-full px-2 py-0.5 ${STATUS_STYLES[status]}`}>{status}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </Section>
      )}

      {plans.length > 0 && (
        <Section title="Çalışma planları" href="/takvim">
          {plans.map((p) => (
            <li key={p.id} className="flex gap-2">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: (p.goal_id && goalColors[p.goal_id]) || DEFAULT_PLAN_COLOR }}
              />
              <div className="min-w-0">
                <p className={p.done ? "text-zinc-400 line-through dark:text-zinc-500" : ""}>{p.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {when(p.starts_at)}–{formatInTimeZone(new Date(p.ends_at), "HH:mm")}
                </p>
              </div>
            </li>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link href={href} className="btn-ghost">
          Aç →
        </Link>
      </div>
      <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">{children}</ul>
    </div>
  );
}
