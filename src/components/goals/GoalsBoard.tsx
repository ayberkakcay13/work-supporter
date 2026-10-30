"use client";

import { useMemo, useState } from "react";
import { buildTopicTree, goalDate, topicStatus, type Goal, type Topic } from "@/lib/goals";
import { loadSeedGoals } from "@/app/(app)/hedefler/actions";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { useAction } from "@/components/useAction";

export function GoalsBoard({
  goals,
  topics,
  today,
  now,
  worked,
}: {
  goals: Goal[];
  topics: Topic[];
  today: string;
  now: string;
  // Konu başına çalışılan süre (ms), sayaç oturumlarından.
  worked: Record<string, number>;
}) {
  const [creating, setCreating] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const seed = useAction();

  const treeByGoal = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const t of topics) map.set(t.goal_id, [...(map.get(t.goal_id) ?? []), t]);
    return new Map([...map].map(([goalId, list]) => [goalId, buildTopicTree(list)]));
  }, [topics]);

  const waitingNotes = topics.filter((t) => topicStatus(t, today) === "gecikti (not bekliyor)").length;

  // Bitiş (yoksa başlangıç) zamanı geçmiş hedefler "geçmiş" bölümüne düşer.
  const isPast = (g: Goal) => {
    const end = g.ends_at ?? g.starts_at;
    return end !== null && end < now;
  };
  // Tarihe göre sıralı; tarihsiz hedefler sonda.
  const byDate = (a: Goal, b: Goal) => (goalDate(a) ?? "9999").localeCompare(goalDate(b) ?? "9999");
  const active = goals.filter((g) => !isPast(g)).sort(byDate);
  const past = goals.filter(isPast);

  const card = (goal: Goal) => (
    <GoalCard key={goal.id} goal={goal} topics={treeByGoal.get(goal.id) ?? []} today={today} worked={worked} />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hedefler</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          + Yeni hedef
        </button>
      </div>

      {waitingNotes > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {waitingNotes} konunun tamamlama tarihi geçti. Neden yetişmediğine dair not bekleniyor.
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card space-y-3 text-sm">
          <p className="text-zinc-500 dark:text-zinc-400">
            Henüz hedef yok. Yeni bir hedef ekleyebilir ya da 2026-2027 Güz dönemi sınav ve projelerini yükleyebilirsin.
          </p>
          <button className="btn-secondary" disabled={seed.pending} onClick={() => seed.run(loadSeedGoals)}>
            {seed.pending ? "Yükleniyor…" : "Başlangıç verisini yükle"}
          </button>
          {seed.error && <p className="text-red-600 dark:text-red-400">{seed.error}</p>}
        </div>
      ) : (
        <div className="space-y-4">{active.map(card)}</div>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <button
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            onClick={() => setShowPast(!showPast)}
          >
            {showPast ? "▾" : "▸"} Geçmiş hedefler ({past.length})
          </button>
          {showPast && <div className="space-y-4 opacity-80">{past.map(card)}</div>}
        </section>
      )}

      {creating && <GoalForm goal={null} onClose={() => setCreating(false)} />}
    </>
  );
}
