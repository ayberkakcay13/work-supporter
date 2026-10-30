"use client";

import { useState } from "react";
import { formatInTimeZone } from "@/lib/dates";
import { daysUntil, type Goal, type TopicNode } from "@/lib/goals";
import { deleteGoal } from "@/app/(app)/hedefler/actions";
import { GoalForm } from "./GoalForm";
import { AddTopicForm, TopicTree } from "./TopicTree";
import { useAction } from "@/components/useAction";

const TYPE_LABELS = { sınav: "Sınav", proje: "Proje", diğer: "Diğer" } as const;

function formatRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const day = (d: Date) => formatInTimeZone(d, "d MMMM yyyy EEEE");
  if (!endIso) return `${day(start)} · ${formatInTimeZone(start, "HH:mm")}`;
  const end = new Date(endIso);
  if (day(start) === day(end)) {
    return `${day(start)} · ${formatInTimeZone(start, "HH:mm")}–${formatInTimeZone(end, "HH:mm")}`;
  }
  return `${formatInTimeZone(start, "d MMMM")} – ${formatInTimeZone(end, "d MMMM yyyy")}`;
}

function countdown(goal: Goal, today: string): string | null {
  if (!goal.starts_at) return null;
  const days = daysUntil(goal.starts_at, today);
  if (days > 0) return `${days} gün kaldı`;
  if (days === 0) return "Bugün";
  if (goal.ends_at && daysUntil(goal.ends_at, today) >= 0) return "Devam ediyor";
  return "Geçti";
}

function countTopics(nodes: TopicNode[]): { total: number; done: number } {
  return nodes.reduce(
    (acc, n) => {
      const sub = countTopics(n.children);
      return { total: acc.total + 1 + sub.total, done: acc.done + (n.completed_at ? 1 : 0) + sub.done };
    },
    { total: 0, done: 0 },
  );
}

export function GoalCard({ goal, topics, today }: { goal: Goal; topics: TopicNode[]; today: string }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const remove = useAction();
  const { total, done } = countTopics(topics);
  const left = countdown(goal, today);

  return (
    <article className="card overflow-hidden p-0">
      <div className="flex gap-4 p-5" style={{ borderLeft: `4px solid ${goal.color}` }}>
        <button
          aria-label={open ? "Daralt" : "Genişlet"}
          className="mt-0.5 h-6 w-6 shrink-0 rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setOpen(!open)}
        >
          {open ? "▾" : "▸"}
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: goal.color }}
            >
              {TYPE_LABELS[goal.type]}
            </span>
            <h2 className="font-semibold">{goal.title}</h2>
            {left && <span className="text-xs text-zinc-500 dark:text-zinc-400">· {left}</span>}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {[goal.starts_at && formatRange(goal.starts_at, goal.ends_at), goal.location].filter(Boolean).join(" · ") ||
              "Tarih yok"}
          </p>
          {goal.notes && <p className="whitespace-pre-line text-sm">{goal.notes}</p>}
          {total > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(done / total) * 100}%`, backgroundColor: goal.color }}
                />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {done}/{total} konu
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-1">
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            Düzenle
          </button>
          <button
            className="btn-ghost text-red-600 dark:text-red-400"
            disabled={remove.pending}
            onClick={() => {
              if (confirm(`"${goal.title}" ve tüm konuları silinsin mi?`)) remove.run(() => deleteGoal(goal.id));
            }}
          >
            Sil
          </button>
        </div>
      </div>

      {remove.error && <p className="px-5 pb-3 text-sm text-red-600 dark:text-red-400">{remove.error}</p>}

      {open && (
        <div className="space-y-2 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <TopicTree nodes={topics} goalId={goal.id} today={today} />
          <AddTopicForm goalId={goal.id} parentId={null} placeholder="Yeni konu" />
        </div>
      )}

      {editing && <GoalForm goal={goal} onClose={() => setEditing(false)} />}
    </article>
  );
}
