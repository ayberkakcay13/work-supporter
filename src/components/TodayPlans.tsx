"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { formatInTimeZone } from "@/lib/dates";
import { DEFAULT_PLAN_COLOR, planDuration, untimedRange, type Plan } from "@/lib/plans";
import { formatTotal } from "@/lib/sessions";
import { deletePlan, savePlan, setPlanDone } from "@/app/(app)/takvim/actions";
import { startSession } from "@/app/(app)/sayac/actions";
import { useAction } from "@/components/useAction";

export type PlanGoal = { id: string; title: string; color: string };

const time = (iso: string) => formatInTimeZone(new Date(iso), "HH:mm");
const dayLabel = (day: string) => format(parseISO(day), "d MMMM EEEE", { locale: tr });

// Bugünün planları: plan ekleme ve plandan sayaç başlatma.
export function TodayPlans({
  plans,
  goals,
  activeGoals,
  today,
  hasOpenSession,
}: {
  plans: Plan[];
  goals: PlanGoal[];
  activeGoals: PlanGoal[];
  today: string;
  hasOpenSession: boolean;
}) {
  const goalById = new Map(goals.map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Bugün için plan yok. Aşağıdan ekleyebilirsin.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {plans.map((p) => (
            <PlanRow
              key={p.id}
              plan={p}
              goal={p.goal_id ? goalById.get(p.goal_id) : undefined}
              canStart
              hasOpenSession={hasOpenSession}
            />
          ))}
        </ul>
      )}
      <AddPlanForm goals={activeGoals} days={[today]} />
    </div>
  );
}

// Haftanın diğer günleri, gün gün.
export function WeekPlans({
  days,
  goals,
  activeGoals,
}: {
  days: { day: string; isPast: boolean; plans: Plan[] }[];
  goals: PlanGoal[];
  activeGoals: PlanGoal[];
}) {
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const withPlans = days.filter((d) => d.plans.length > 0);
  // Geçmiş günlere plan eklenmez.
  const addableDays = days.filter((d) => !d.isPast).map((d) => d.day);

  return (
    <div className="space-y-4">
      {withPlans.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Haftanın diğer günleri için plan yok.</p>
      ) : (
        <div className="space-y-3">
          {withPlans.map((d) => (
            <div key={d.day} className={d.isPast ? "opacity-60" : ""}>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {dayLabel(d.day)} · {formatTotal(d.plans.reduce((sum, p) => sum + planDuration(p), 0))}
              </p>
              <ul>
                {d.plans.map((p) => (
                  <PlanRow key={p.id} plan={p} goal={p.goal_id ? goalById.get(p.goal_id) : undefined} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {addableDays.length > 0 && <AddPlanForm goals={activeGoals} days={addableDays} />}
    </div>
  );
}

function PlanRow({
  plan,
  goal,
  canStart = false,
  hasOpenSession = false,
}: {
  plan: Plan;
  goal?: PlanGoal;
  canStart?: boolean;
  hasOpenSession?: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();

  function startTimer() {
    if (hasOpenSession && !confirm("Çalışan sayaç durdurulup bu plan için yenisi başlatılsın mı?")) return;
    // Sayaç, planın süresi kadar alarm kurulu olarak başlar.
    const minutes = Math.min(600, Math.max(1, Math.round(planDuration(plan) / 60_000)));
    run(
      () => startSession("work", minutes, plan.goal_id, plan.topic_id),
      () => router.push("/sayac"),
    );
  }

  return (
    <li className="group">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-indigo-600"
          checked={plan.done}
          disabled={pending}
          onChange={(e) => run(() => setPlanDone(plan.id, e.target.checked))}
        />
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: goal?.color ?? DEFAULT_PLAN_COLOR }}
        />
        <span className="w-24 shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {plan.untimed ? formatTotal(planDuration(plan)) : `${time(plan.starts_at)}–${time(plan.ends_at)}`}
        </span>
        <span className="min-w-0 flex-1">
          <span className={plan.done ? "text-zinc-400 line-through dark:text-zinc-500" : canStart ? "font-medium" : ""}>
            {plan.title}
          </span>
          {goal && <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{goal.title}</span>}
        </span>
        <button
          className="btn-ghost text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 dark:text-red-400"
          disabled={pending}
          onClick={() => confirm(`"${plan.title}" silinsin mi?`) && run(() => deletePlan(plan.id))}
        >
          Sil
        </button>
        {canStart && !plan.done && (
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={pending} onClick={startTimer}>
            ▶ Sayacı başlat
          </button>
        )}
      </div>
      {error && <p className="pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}

// Süre odaklı plan ekleme: gün (tek gün verilirse seçim çıkmaz) + kaç saat + ders / proje.
function AddPlanForm({ goals, days }: { goals: PlanGoal[]; days: string[] }) {
  const [title, setTitle] = useState("");
  // Süre 1 saatle dolu gelir; boş bir kutu "eklenmiyor" gibi görünmesin.
  const [hours, setHours] = useState("1");
  const [goalId, setGoalId] = useState("");
  const [day, setDay] = useState(days[0]);
  const [invalid, setInvalid] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  const minutes = Math.round(Number(hours.replace(",", ".")) * 60);
  const selectedDay = days.includes(day) ? day : days[0];

  return (
    <form
      className="space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/40"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return setInvalid("Ne çalışacağını yaz.");
        if (!(minutes > 0 && minutes <= 600)) return setInvalid("Süre 0,5 ile 10 saat arasında olmalı.");
        setInvalid(null);
        run(
          () =>
            savePlan(null, {
              title,
              ...untimedRange(selectedDay, minutes),
              goal_id: goalId || null,
              topic_id: null,
              untimed: true,
            }),
          () => {
            setTitle("");
            setHours("1");
          },
        );
      }}
    >
      <p className="text-sm font-medium">Plan ekle</p>
      <div className="flex flex-wrap items-center gap-2">
        {days.length > 1 && (
          <select value={selectedDay} onChange={(e) => setDay(e.target.value)} className="input w-auto py-1.5">
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ne çalışacaksın?"
          className="input min-w-48 flex-1 py-1.5"
        />
        <label className="flex items-center gap-1 text-sm">
          <input
            type="text"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="input w-16 py-1.5 text-center"
            aria-label="Kaç saat"
          />
          saat
        </label>
        {goals.length > 0 && (
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input w-auto max-w-56 py-1.5">
            <option value="">Ders / proje yok</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="btn-primary py-1.5" disabled={pending}>
          {pending ? "Ekleniyor…" : "Ekle"}
        </button>
      </div>
      {(invalid ?? error) && <p className="text-sm text-red-600 dark:text-red-400">{invalid ?? error}</p>}
    </form>
  );
}
