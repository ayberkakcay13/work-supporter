"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { DEFAULT_PLAN_COLOR, planDuration, type Plan } from "@/lib/plans";
import { formatTotal } from "@/lib/sessions";
import { shiftPeriod } from "@/lib/todos";
import { clearSlot, placeSlot, writeNote } from "@/app/(app)/gun-plani/actions";

export type DaySlot = { hour: number; plan_id: string | null; note: string | null };

// Bir saat ya bir plan ya da elle yazılmış bir not tutar.
type Entry = { planId: string } | { note: string };

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 07:00 – 24:00
const DRAG_TYPE = "application/x-gun-plani";
const NOTE_COLOR = "#a1a1aa";

function period(hour: number): string {
  if (hour < 12) return "Sabah";
  if (hour < 17) return "Öğle";
  if (hour < 21) return "Akşam";
  return "Gece";
}

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

const saveEntry = (day: string, hour: number, entry: Entry) =>
  "planId" in entry ? placeSlot(day, hour, entry.planId) : writeNote(day, hour, entry.note);

// Günün planlarını saatlere yerleştirme taslağı. Sadece görsel; planları ve süreleri değiştirmez.
export function DayPlanner({
  day,
  today,
  currentHour,
  plans,
  goals,
  initialSlots,
}: {
  day: string;
  today: string;
  currentHour: number | null;
  plans: Plan[];
  goals: { id: string; title: string; color: string }[];
  initialSlots: DaySlot[];
}) {
  const planById = new Map(plans.map((p) => [p.id, p]));
  const goalById = new Map(goals.map((g) => [g.id, g]));
  // Başka güne taşınmış planların eski yerleşimleri gösterilmez.
  const [slots, setSlots] = useState<Record<number, Entry>>(() =>
    Object.fromEntries(
      initialSlots.flatMap((s): [number, Entry][] => {
        if (s.note) return [[s.hour, { note: s.note }]];
        if (s.plan_id && planById.has(s.plan_id)) return [[s.hour, { planId: s.plan_id }]];
        return [];
      }),
    ),
  );
  const [overHour, setOverHour] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ hour: number; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Esc ile vazgeçilince kutu kapanırken gelen odak kaybı kaydetmesin.
  const cancelNote = useRef(false);

  const colorOf = (p: Plan) => (p.goal_id && goalById.get(p.goal_id)?.color) || DEFAULT_PLAN_COLOR;
  const placedHours = (planId: string) =>
    Object.values(slots).filter((e) => "planId" in e && e.planId === planId).length;

  // Ekran hemen güncellenir; kayıt başarısız olursa eski hâline döner.
  async function apply(next: Record<number, Entry>, save: () => Promise<{ error?: string }[]>) {
    const previous = slots;
    setSlots(next);
    setError(null);
    const failed = (await save()).find((r) => r.error);
    if (failed) {
      setSlots(previous);
      setError(failed.error!);
    }
  }

  function drop(hour: number, data: { entry: Entry; fromHour: number | null }) {
    if (data.fromHour === hour) return;
    const next = { ...slots, [hour]: data.entry };
    if (data.fromHour !== null) delete next[data.fromHour];
    void apply(next, async () => {
      const placed = await saveEntry(day, hour, data.entry);
      if (placed.error || data.fromHour === null) return [placed];
      return [placed, await clearSlot(day, data.fromHour)];
    });
  }

  function remove(hour: number) {
    const next = { ...slots };
    delete next[hour];
    void apply(next, async () => [await clearSlot(day, hour)]);
  }

  // Boş bırakılan not saati boşaltır; değişmediyse bir şey yapılmaz.
  function startEditing(hour: number, text: string) {
    cancelNote.current = false;
    setEditing({ hour, text });
  }

  function commitNote() {
    if (cancelNote.current) {
      cancelNote.current = false;
      return;
    }
    if (!editing) return;
    const { hour, text } = editing;
    setEditing(null);
    const note = text.trim();
    const current = slots[hour];
    if (!note) {
      if (current && "note" in current) remove(hour);
      return;
    }
    if (current && "note" in current && current.note === note) return;
    void apply({ ...slots, [hour]: { note } }, async () => [await writeNote(day, hour, note)]);
  }

  const startDrag = (e: React.DragEvent, entry: Entry, fromHour: number | null) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ entry, fromHour }));
    e.dataTransfer.effectAllowed = "move";
  };

  const nav = (d: string) => (d === today ? "/gun-plani" : `/gun-plani?tarih=${d}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
            ← Ana ekran
          </Link>
          <h1 className="text-2xl font-semibold">Gün planı</h1>
        </div>
        <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          Sadece kafanda günü oturtman için bir taslak: planlarını, sürelerini ya da istatistikleri değiştirmez.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
        <Link href={nav(shiftPeriod("day", day, -1))} className="hover:underline">
          ← Önceki
        </Link>
        <span className="flex items-center gap-3">
          {format(parseISO(day), "d MMMM yyyy EEEE", { locale: tr })}
          {day !== today && (
            <Link href={nav(today)} className="rounded-md bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30">
              Bugün
            </Link>
          )}
        </span>
        <Link href={nav(shiftPeriod("day", day, 1))} className="hover:underline">
          Sonraki →
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">Kaydedilemedi: {error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="card overflow-hidden p-0">
          {HOURS.map((hour) => {
            const entry = slots[hour];
            const plan = entry && "planId" in entry ? planById.get(entry.planId) : undefined;
            const note = entry && "note" in entry ? entry.note : null;
            const isNow = hour === currentHour;
            const isEditing = editing?.hour === hour;
            return (
              <div
                key={hour}
                className={`grid grid-cols-[7.5rem_1fr] border-b border-zinc-100 last:border-b-0 dark:border-zinc-800 ${
                  isNow ? "bg-amber-50 dark:bg-amber-500/10" : ""
                }`}
              >
                <div className="flex flex-col items-end justify-center px-3 py-2 text-right">
                  <span className="text-sm font-semibold">{period(hour)}</span>
                  <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {pad(hour)} – {pad(hour + 1)}
                  </span>
                </div>
                <div
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                    e.preventDefault();
                    setOverHour(hour);
                  }}
                  onDragLeave={() => setOverHour((h) => (h === hour ? null : h))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOverHour(null);
                    const raw = e.dataTransfer.getData(DRAG_TYPE);
                    if (raw) drop(hour, JSON.parse(raw));
                  }}
                  className={`m-1 min-h-14 rounded-lg border-2 border-dashed transition-colors ${
                    overHour === hour
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                      : entry || isEditing
                        ? "border-transparent"
                        : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex h-full min-h-13 items-center gap-2 px-2">
                      {/* Kayıt tek yerden (odak kaybı) yapılır; Enter odağı bırakır, Esc vazgeçer. */}
                      <input
                        autoFocus
                        maxLength={80}
                        value={editing.text}
                        onChange={(e) => setEditing({ hour, text: e.target.value })}
                        onBlur={commitNote}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            cancelNote.current = true;
                            setEditing(null);
                          }
                        }}
                        placeholder="Ör. Yemek, Spor, Yol…"
                        className="input py-1.5"
                      />
                    </div>
                  ) : plan || note !== null ? (
                    <div
                      draggable
                      onDragStart={(e) => startDrag(e, entry!, hour)}
                      onClick={() => note !== null && startEditing(hour, note)}
                      title={note !== null ? "Düzenlemek için tıkla" : undefined}
                      className="group flex h-full min-h-13 cursor-grab items-center gap-3 rounded-md border-l-4 px-3 active:cursor-grabbing"
                      style={{
                        borderLeftColor: plan ? colorOf(plan) : NOTE_COLOR,
                        backgroundColor: `${plan ? colorOf(plan) : NOTE_COLOR}24`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        {plan ? (
                          <>
                            <p className="truncate font-medium">{plan.title}</p>
                            {plan.goal_id && goalById.get(plan.goal_id) && (
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {goalById.get(plan.goal_id)!.title}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="truncate italic">{note}</p>
                        )}
                      </div>
                      <button
                        aria-label="Saati boşalt"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(hour);
                        }}
                        className="rounded px-1.5 text-zinc-400 opacity-0 hover:bg-black/5 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    // Boş saate tıklayınca elle not yazılır.
                    <button
                      type="button"
                      onClick={() => startEditing(hour, "")}
                      className="group flex h-full min-h-13 w-full items-center px-3 text-left text-sm text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <span className="opacity-0 group-hover:opacity-100">+ Not yaz</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="card h-fit space-y-3 lg:sticky lg:top-4">
          <div>
            <h2 className="font-medium">Günün dersleri</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Saatlere sürükle. Boş bir saate tıklayarak yemek, spor gibi bir not yazabilirsin. Yerleşenleri başka
              saate sürükleyerek taşıyabilir, × ile boşaltabilirsin.
            </p>
          </div>
          {plans.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Bu gün için plan yok.{" "}
              <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Ana ekrandan ekle
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {plans.map((p) => {
                const plannedHours = planDuration(p) / 3_600_000;
                const placed = placedHours(p.id);
                return (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={(e) => startDrag(e, { planId: p.id }, null)}
                    className="cursor-grab space-y-1 rounded-lg border-l-4 bg-zinc-50 px-3 py-2 active:cursor-grabbing dark:bg-zinc-800/60"
                    style={{ borderLeftColor: colorOf(p) }}
                  >
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                      {formatTotal(placed * 3_600_000)} / {formatTotal(planDuration(p))} yerleşti
                      {placed >= plannedHours && <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
