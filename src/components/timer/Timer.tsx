"use client";

import { useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "@/lib/dates";
import { formatClock, formatTotal, plannedEnd, sessionDuration, workTotal, type Session, type SessionKind } from "@/lib/sessions";
import { notify, playChime, requestNotificationPermission } from "@/lib/sound";
import { deleteSession, endSession, startSession } from "@/app/(app)/sayac/actions";
import { useAction } from "@/components/useAction";

export type TimerGoal = { id: string; title: string; color: string; topics: { id: string; label: string }[] };

type Defaults = {
  workFixed: boolean;
  breakFixed: boolean;
  workMin: number;
  breakMin: number;
  goalId: string;
  topicId: string;
};

const KIND_LABELS: Record<SessionKind, string> = { work: "Çalışma", break: "Mola" };

export function Timer({
  open,
  todaySessions,
  lastEnded,
  goals,
  defaults,
  soundEnabled,
  dayStart,
  serverNow,
}: {
  open: Session | null;
  todaySessions: Session[];
  lastEnded: Session | null;
  goals: TimerGoal[];
  defaults: Defaults;
  soundEnabled: boolean;
  dayStart: string;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);
  const offsetRef = useRef(0);
  const handledRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pending, error, run } = useAction();

  const [workFixed, setWorkFixed] = useState(defaults.workFixed);
  const [breakFixed, setBreakFixed] = useState(defaults.breakFixed);
  const [workMin, setWorkMin] = useState(String(defaults.workMin));
  const [breakMin, setBreakMin] = useState(String(defaults.breakMin));
  const knownGoal = goals.find((g) => g.id === defaults.goalId);
  const [goalId, setGoalId] = useState(knownGoal ? defaults.goalId : "");
  const [topicId, setTopicId] = useState(
    knownGoal?.topics.some((t) => t.id === defaults.topicId) ? defaults.topicId : "",
  );

  const end = open ? plannedEnd(open) : null;

  // Süre, başlangıç zamanından hesaplanır; aralık sadece ekranı yeniler.
  // Saat farkı sunucu saatine göre düzeltilir.
  useEffect(() => {
    offsetRef.current = serverNow - Date.now();
    const tick = () => {
      const current = Date.now() + offsetRef.current;
      setNow(current);
      if (open && end !== null && current >= end && !handledRef.current) {
        handledRef.current = true;
        if (soundEnabled) playChime();
        notify(
          open.kind === "work" ? "Çalışma süresi doldu" : "Mola bitti",
          open.kind === "work" ? "Mola vermeyi unutma." : "Hazır olduğunda yeni çalışmayı başlat.",
        );
        void endSession(open.id);
      }
    };
    // Sayfa açıldığında süresi zaten dolmuşsa ses çıkarmadan kapatılır.
    if (open && end !== null && serverNow >= end) {
      handledRef.current = true;
      void endSession(open.id);
    }
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, end, serverNow, soundEnabled]);

  // Sekme başlığında kalan / geçen süre.
  const elapsed = open ? Math.max(0, now - Date.parse(open.started_at)) : 0;
  const shown = open && end !== null ? Math.max(0, end - now) : elapsed;
  useEffect(() => {
    if (!open) return;
    const previous = document.title;
    document.title = `${formatClock(shown)} · ${KIND_LABELS[open.kind]}`;
    return () => {
      document.title = previous;
    };
  }, [open, shown]);

  function start(kind: SessionKind) {
    const fixed = kind === "work" ? workFixed : breakFixed;
    const minutes = Number(kind === "work" ? workMin : breakMin);
    if (fixed && !(Number.isInteger(minutes) && minutes > 0)) return;
    requestNotificationPermission();
    run(() =>
      startSession(kind, fixed ? minutes : null, goalId || null, topicId || null, {
        work: workFixed ? Number(workMin) : null,
        break: breakFixed ? Number(breakMin) : null,
      }),
    );
  }

  const openGoal = open?.goal_id ? goals.find((g) => g.id === open.goal_id) : undefined;
  const openTopic = openGoal?.topics.find((t) => t.id === open?.topic_id);
  const progress = open && end !== null ? Math.min(1, elapsed / (end - Date.parse(open.started_at))) : null;

  // Son biten oturum 15 dakikadan yeniyse sıradaki adım önerilir.
  const justEnded = !open && lastEnded && serverNow - Date.parse(lastEnded.ended_at!) < 15 * 60_000 ? lastEnded : null;
  const suggested: SessionKind = justEnded?.kind === "work" ? "break" : "work";

  const todayWork = workTotal(todaySessions, Date.parse(dayStart), Date.parse(dayStart) + 86_400_000, now);
  const selectedGoal = goals.find((g) => g.id === goalId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sayaç</h1>
        <button
          className="btn-secondary"
          onClick={() =>
            document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
          }
        >
          ⛶ Tam ekran
        </button>
      </div>

      <div
        ref={containerRef}
        className="card flex min-h-[420px] flex-col items-center justify-center gap-6 bg-white text-center dark:bg-zinc-900 [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        {open ? (
          <>
            <div className="space-y-1">
              <p
                className={`text-sm font-semibold uppercase tracking-widest ${
                  open.kind === "work" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {KIND_LABELS[open.kind]}
                {open.planned_minutes ? ` · ${open.planned_minutes} dk` : " · süresiz"}
              </p>
              {openGoal && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: openGoal.color }} />
                  {openGoal.title}
                  {openTopic && ` › ${openTopic.label}`}
                </p>
              )}
            </div>
            <p className="font-mono text-7xl font-semibold tabular-nums sm:text-8xl [:fullscreen_&]:text-[12rem]">
              {formatClock(shown)}
            </p>
            {progress !== null && (
              <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-[width] ${open.kind === "work" ? "bg-indigo-500" : "bg-emerald-500"}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Başlangıç {formatInTimeZone(new Date(open.started_at), "HH:mm")}
              {end !== null && ` · bitiş ${formatInTimeZone(new Date(end), "HH:mm")}`}
            </p>
            <button className="btn-primary px-8" disabled={pending} onClick={() => run(() => endSession(open.id))}>
              {open.kind === "work" ? "Çalışmayı bitir" : "Molayı bitir"}
            </button>
          </>
        ) : (
          <>
            {justEnded && (
              <p className="text-lg font-medium">
                {justEnded.kind === "work"
                  ? `🎉 ${formatTotal(sessionDuration(justEnded, now))} çalıştın. Mola zamanı!`
                  : "Mola bitti. Hazır olduğunda çalışmaya başla."}
              </p>
            )}

            <div className="grid w-full max-w-xl gap-4 text-left sm:grid-cols-2">
              <DurationPicker
                label="Çalışma"
                fixed={workFixed}
                minutes={workMin}
                onFixed={setWorkFixed}
                onMinutes={setWorkMin}
              />
              <DurationPicker
                label="Mola"
                fixed={breakFixed}
                minutes={breakMin}
                onFixed={setBreakFixed}
                onMinutes={setBreakMin}
              />
              <label className="block space-y-1">
                <span className="text-sm font-medium">Hedef (isteğe bağlı)</span>
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
                <span className="text-sm font-medium">Konu (isteğe bağlı)</span>
                <select
                  value={topicId}
                  disabled={!selectedGoal}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="input disabled:opacity-60"
                >
                  <option value="">— Yok —</option>
                  {selectedGoal?.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-3">
              {(["work", "break"] as SessionKind[]).map((kind) => (
                <button
                  key={kind}
                  className={kind === suggested ? "btn-primary px-8" : "btn-secondary px-8"}
                  disabled={pending}
                  onClick={() => start(kind)}
                >
                  {kind === "work" ? "Çalışmaya başla" : "Molaya başla"}
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Bugünkü oturumlar</h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Toplam çalışma: {formatTotal(todayWork)}</span>
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bugün henüz oturum yok.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...todaySessions].reverse().map((s) => {
              const goal = s.goal_id ? goals.find((g) => g.id === s.goal_id) : undefined;
              return (
                <li key={s.id} className="group flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <span className="w-28 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {formatInTimeZone(new Date(s.started_at), "HH:mm")}–
                    {s.ended_at ? formatInTimeZone(new Date(s.ended_at), "HH:mm") : "…"}
                  </span>
                  <span
                    className={`w-16 shrink-0 text-xs font-medium ${
                      s.kind === "work" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {KIND_LABELS[s.kind]}
                  </span>
                  <span className="w-20 shrink-0 tabular-nums">{formatTotal(sessionDuration(s, now))}</span>
                  {goal && (
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: goal.color }} />
                      {goal.title}
                    </span>
                  )}
                  {s.ended_at && (
                    <button
                      className="btn-ghost ml-auto text-red-600 opacity-0 group-hover:opacity-100 dark:text-red-400"
                      disabled={pending}
                      onClick={() => confirm("Bu oturum silinsin mi?") && run(() => deleteSession(s.id))}
                    >
                      Sil
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function DurationPicker({
  label,
  fixed,
  minutes,
  onFixed,
  onMinutes,
}: {
  label: string;
  fixed: boolean;
  minutes: string;
  onFixed: (fixed: boolean) => void;
  onMinutes: (minutes: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => onFixed(value)}
              className={`rounded-md px-3 py-1.5 ${
                fixed === value ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {value ? "Sabit" : "Süresiz"}
            </button>
          ))}
        </div>
        {fixed && (
          <label className="flex items-center gap-1 text-sm">
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => onMinutes(e.target.value)}
              className="input w-20 py-1.5"
            />
            dk
          </label>
        )}
      </div>
    </div>
  );
}
