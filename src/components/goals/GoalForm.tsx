"use client";

import { useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "@/lib/dates";
import { goalDate, type Goal } from "@/lib/goals";
import { saveGoal } from "@/app/(app)/hedefler/actions";
import { useAction } from "@/components/useAction";

// Hazır renkler; grafiklerde dersler bu renklerle ayrışır.
const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9", "#ef4444", "#8b5cf6", "#84cc16"];

// Yeni hedef (goal = null) ya da mevcut hedefi düzenleme penceresi: başlık, bitiş tarihi, renk.
export function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initialDue = goal && goalDate(goal) ? formatInTimeZone(new Date(goalDate(goal)!), "yyyy-MM-dd") : "";
  const [title, setTitle] = useState(goal?.title ?? "");
  const [due, setDue] = useState(initialDue);
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const { pending, error, run } = useAction();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveGoal(goal?.id ?? null, { title, color, dueDate: due || null }, due !== initialDue),
            () => dialogRef.current?.close(),
          );
        }}
      >
        <h2 className="text-lg font-semibold">{goal ? "Hedefi düzenle" : "Yeni hedef"}</h2>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Başlık</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" autoFocus />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Bitiş tarihi</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium">Renk</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ${
                  color === c ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
