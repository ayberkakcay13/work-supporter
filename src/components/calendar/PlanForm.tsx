"use client";

import { useEffect, useRef, useState } from "react";
import { isoToLocalInput, localInputToIso, type Goal } from "@/lib/goals";
import { planDuration, untimedRange, type Plan } from "@/lib/plans";
import { formatInTimeZone } from "@/lib/dates";
import { deletePlan, savePlan } from "@/app/(app)/takvim/actions";
import { useAction } from "@/components/useAction";

export type TopicOption = { id: string; goalId: string; label: string; done: boolean };

export type PlanDraft = Omit<Plan, "id"> & { id: string | null };

// Yeni plan (draft.id = null) ya da mevcut planı düzenleme penceresi.
export function PlanForm({
  draft,
  goals,
  topicOptions,
  onClose,
}: {
  draft: PlanDraft;
  goals: Goal[];
  topicOptions: TopicOption[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(draft.title);
  const [goalId, setGoalId] = useState(draft.goal_id ?? "");
  const [topicId, setTopicId] = useState(draft.topic_id ?? "");
  const [start, setStart] = useState(isoToLocalInput(draft.starts_at));
  const [end, setEnd] = useState(isoToLocalInput(draft.ends_at));
  const [isDone, setIsDone] = useState(draft.done);
  // Saatsiz planda sadece gün ve kaç saat çalışılacağı girilir.
  const [untimed, setUntimed] = useState(draft.untimed);
  const [day, setDay] = useState(formatInTimeZone(new Date(draft.starts_at), "yyyy-MM-dd"));
  const [hours, setHours] = useState(String(Math.round((planDuration(draft) / 3_600_000) * 100) / 100));
  const { pending, error, run } = useAction();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Tamamlanmış konular sadece zaten seçiliyse listelenir.
  const topics = topicOptions.filter((t) => t.goalId === goalId && (!t.done || t.id === topicId));
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const minutes = Math.round(Number(hours.replace(",", ".")) * 60);
          const range = untimed
            ? minutes > 0 && minutes <= 600 && day
              ? untimedRange(day, minutes)
              : null
            : { starts_at: localInputToIso(start), ends_at: localInputToIso(end) };
          if (!range?.starts_at || !range.ends_at) return;
          run(
            () =>
              savePlan(draft.id, {
                title,
                starts_at: range.starts_at!,
                ends_at: range.ends_at!,
                goal_id: goalId || null,
                topic_id: topicId || null,
                done: isDone,
                untimed,
              }),
            close,
          );
        }}
      >
        <h2 className="text-lg font-semibold">{draft.id ? "Planı düzenle" : "Yeni çalışma planı"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Hedef</span>
            <select
              value={goalId}
              onChange={(e) => {
                setGoalId(e.target.value);
                setTopicId("");
              }}
              className="input"
            >
              <option value="">— Yok —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Konu</span>
            <select
              value={topicId}
              disabled={!goalId}
              onChange={(e) => {
                setTopicId(e.target.value);
                const picked = topicOptions.find((t) => t.id === e.target.value);
                if (picked && !title.trim()) setTitle(picked.label);
              }}
              className="input disabled:opacity-60"
            >
              <option value="">— Yok —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Başlık</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" autoFocus />
        </label>

        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setUntimed(value)}
              className={`flex-1 rounded-md px-3 py-1.5 ${
                untimed === value ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {value ? "Sadece süre" : "Belirli saatler"}
            </button>
          ))}
        </div>

        {untimed ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Gün</span>
              <input type="date" required value={day} onChange={(e) => setDay(e.target.value)} className="input" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Kaç saat</span>
              <input
                type="number"
                required
                min={0.5}
                max={10}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="input"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Başlangıç</span>
              <input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} className="input" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Bitiş</span>
              <input type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} className="input" />
            </label>
          </div>
        )}

        {draft.id && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) => setIsDone(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Çalışıldı
          </label>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-2">
          {draft.id && (
            <button
              type="button"
              className="btn-ghost text-red-600 dark:text-red-400"
              disabled={pending}
              onClick={() => {
                if (confirm("Bu plan silinsin mi?")) run(() => deletePlan(draft.id!), close);
              }}
            >
              Sil
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-secondary" onClick={close}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
