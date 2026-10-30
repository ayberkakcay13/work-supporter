"use client";

import { useState } from "react";
import type { Todo, TodoScope } from "@/lib/todos";
import { addTodo, deleteTodo, moveTodo, renameTodo, setTodoDone } from "@/app/(app)/yapilacaklar/actions";
import { useAction } from "@/components/useAction";

export type GoalOption = { id: string; title: string; color: string };

// Bir dönemin yapılacaklar listesi. goals: tüm hedefler (renk için), goalOptions: seçilebilenler,
// currentStart: içinde bulunulan dönemin başı (taşıma için).
export function TodoList({
  todos,
  goals,
  goalOptions,
  scope,
  periodStart,
  currentStart,
}: {
  todos: Todo[];
  goals: GoalOption[];
  goalOptions: GoalOption[];
  scope: TodoScope;
  periodStart: string;
  currentStart: string;
}) {
  const goalById = new Map(goals.map((g) => [g.id, g]));
  // Bitmemişler üstte, kendi sıralarıyla; bitenler altta.
  const sorted = [...todos].sort(
    (a, b) =>
      Number(a.done_at !== null) - Number(b.done_at !== null) ||
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at),
  );
  const doneCount = todos.filter((t) => t.done_at).length;
  const isPast = periodStart < currentStart;

  return (
    <div className="space-y-3">
      {todos.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {doneCount}/{todos.length} tamamlandı
        </p>
      )}
      {todos.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">Bu dönem için madde yok.</p>}
      <ul className="space-y-0.5">
        {sorted.map((t) => (
          <TodoItem
            key={t.id}
            todo={t}
            goal={t.goal_id ? goalById.get(t.goal_id) : undefined}
            moveTo={isPast && !t.done_at ? currentStart : null}
          />
        ))}
      </ul>
      <AddTodoForm scope={scope} periodStart={periodStart} goals={goalOptions} />
    </div>
  );
}

function TodoItem({ todo, goal, moveTo }: { todo: Todo; goal?: GoalOption; moveTo: string | null }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const { pending, error, run } = useAction();
  const done = todo.done_at !== null;

  return (
    <li>
      <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600"
          checked={done}
          disabled={pending}
          onChange={(e) => run(() => setTodoDone(todo.id, e.target.checked))}
        />
        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameTodo(todo.id, title), () => setEditing(false));
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="input py-1.5"
            />
            <button type="submit" className="btn-secondary py-1.5" disabled={pending}>
              Kaydet
            </button>
          </form>
        ) : (
          <>
            <span className={`flex-1 ${done ? "text-zinc-400 line-through dark:text-zinc-500" : ""}`}>{todo.title}</span>
            {goal && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: goal.color }} />
                {goal.title}
              </span>
            )}
            <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {moveTo && (
                <button className="btn-ghost" disabled={pending} onClick={() => run(() => moveTodo(todo.id, moveTo))}>
                  Bu döneme taşı
                </button>
              )}
              <button className="btn-ghost" onClick={() => setEditing(true)}>
                Düzenle
              </button>
              <button
                className="btn-ghost text-red-600 dark:text-red-400"
                disabled={pending}
                onClick={() => confirm(`"${todo.title}" silinsin mi?`) && run(() => deleteTodo(todo.id))}
              >
                Sil
              </button>
            </span>
          </>
        )}
      </div>
      {error && <p className="ml-9 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}

function AddTodoForm({ scope, periodStart, goals }: { scope: TodoScope; periodStart: string; goals: GoalOption[] }) {
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const { pending, error, run } = useAction();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addTodo(scope, periodStart, title, goalId || null), () => setTitle(""));
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Yeni madde"
        className="input max-w-sm flex-1 py-1.5"
      />
      {goals.length > 0 && (
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input w-auto max-w-56 py-1.5">
          <option value="">Hedef yok</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="btn-secondary py-1.5" disabled={pending || !title.trim()}>
        Ekle
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
