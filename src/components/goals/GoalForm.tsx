"use client";

import { useEffect, useRef } from "react";
import { GOAL_TYPES, isoToLocalInput, type Goal } from "@/lib/goals";
import { saveGoal } from "@/app/(app)/hedefler/actions";
import { useAction } from "@/components/useAction";

const TYPE_LABELS = { sınav: "Sınav", proje: "Proje", diğer: "Diğer" } as const;

// Yeni hedef (goal = null) ya da mevcut hedefi düzenleme penceresi.
export function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pending, error, run } = useAction();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          // action yerine onSubmit: hata olursa girilen değerler silinmesin.
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          run(() => saveGoal(goal?.id ?? null, form), () => dialogRef.current?.close());
        }}
      >
        <h2 className="text-lg font-semibold">{goal ? "Hedefi düzenle" : "Yeni hedef"}</h2>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Başlık</span>
            <input name="title" required defaultValue={goal?.title} className="input" autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Renk</span>
            <input
              name="color"
              type="color"
              defaultValue={goal?.color ?? "#6366f1"}
              className="h-[38px] w-14 cursor-pointer rounded-lg border border-zinc-300 bg-transparent dark:border-zinc-700"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Tür</span>
            <select name="type" defaultValue={goal?.type ?? "sınav"} className="input">
              {GOAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Ders kodu</span>
            <input name="course_code" defaultValue={goal?.course_code ?? ""} placeholder="COMP 201" className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Başlangıç</span>
            <input name="starts_at" type="datetime-local" defaultValue={isoToLocalInput(goal?.starts_at ?? null)} className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Bitiş</span>
            <input name="ends_at" type="datetime-local" defaultValue={isoToLocalInput(goal?.ends_at ?? null)} className="input" />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Yer</span>
          <input name="location" defaultValue={goal?.location ?? ""} placeholder="A401" className="input" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Not</span>
          <textarea name="notes" rows={3} defaultValue={goal?.notes ?? ""} className="input" />
        </label>

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
