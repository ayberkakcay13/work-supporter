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
const QUICK_MINUTES: Record<SessionKind, number[]> = { work: [25, 50, 90], break: [5, 10, 15] };
const KIND_COLORS: Record<SessionKind, { ring: string; text: string }> = {
  work: { ring: "stroke-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
  break: { ring: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
};

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

  // Son biten oturum 15 dakikadan yeniyse sıradaki adım önerilir (çalışmadan sonra mola).
  const justEnded = !open && lastEnded && serverNow - Date.parse(lastEnded.ended_at!) < 15 * 60_000 ? lastEnded : null;

  // Tercihler: 1) çalışma / mola, 2) alarm dakikası (boş = süresiz), 3) ders / proje.
  const [kind, setKind] = useState<SessionKind>(justEnded?.kind === "work" ? "break" : "work");
  const [alarm, setAlarm] = useState<Record<SessionKind, string>>({
    work: defaults.workFixed ? String(defaults.workMin) : "",
    break: defaults.breakFixed ? String(defaults.breakMin) : "",
  });
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

  const elapsed = open ? Math.max(0, now - Date.parse(open.started_at)) : 0;

  // Sekme başlığında geçen süre.
  useEffect(() => {
    if (!open) return;
    const previous = document.title;
    document.title = `${formatClock(elapsed)} · ${KIND_LABELS[open.kind]}`;
    return () => {
      document.title = previous;
    };
  }, [open, elapsed]);

  const alarmMinutes = Number(alarm[kind]);
  const alarmValid = alarm[kind] === "" || (Number.isInteger(alarmMinutes) && alarmMinutes > 0 && alarmMinutes <= 600);

  function start() {
    if (!alarmValid) return;
    requestNotificationPermission();
    const minutes = (k: SessionKind) => (alarm[k] ? Number(alarm[k]) : null);
    run(() =>
      startSession(kind, minutes(kind), goalId || null, topicId || null, { work: minutes("work"), break: minutes("break") }),
    );
  }

  // Halka: sabit sürede alarma kadar dolar; süresizde her dakika bir tur atar.
  const shownKind = open?.kind ?? kind;
  const progress = open
    ? end !== null
      ? Math.min(1, elapsed / (end - Date.parse(open.started_at)))
      : (elapsed % 60_000) / 60_000
    : 0;

  const openGoal = open?.goal_id ? goals.find((g) => g.id === open.goal_id) : undefined;
  const openTopic = openGoal?.topics.find((t) => t.id === open?.topic_id);
  const selectedGoal = goals.find((g) => g.id === goalId);
  const todayWork = workTotal(todaySessions, Date.parse(dayStart), Date.parse(dayStart) + 86_400_000, now);

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
        className="card flex flex-col items-center gap-6 bg-white py-8 dark:bg-zinc-900 [&:fullscreen]:justify-center [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        {justEnded && (
          <p className="text-center font-medium">
            {justEnded.kind === "work"
              ? `🎉 ${formatTotal(sessionDuration(justEnded, now))} çalıştın. Mola zamanı!`
              : "Mola bitti. Hazır olduğunda çalışmaya başla."}
          </p>
        )}

        <Dial progress={progress} kind={shownKind} smooth={end !== null}>
          <p className={`text-xs font-semibold uppercase tracking-widest ${KIND_COLORS[shownKind].text}`}>
            {KIND_LABELS[shownKind]}
          </p>
          <p className="font-mono text-6xl font-semibold tabular-nums">{formatClock(elapsed)}</p>
          <p className="h-4 text-xs text-zinc-500 dark:text-zinc-400">
            {open
              ? end !== null
                ? `⏰ ${formatInTimeZone(new Date(end), "HH:mm")} · kalan ${formatClock(end - now)}`
                : "Alarm yok"
              : alarm[kind]
                ? `⏰ ${alarm[kind]}. dakikada`
                : "Alarm yok"}
          </p>
          {open ? (
            <button
              className="mt-2 rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              disabled={pending}
              onClick={() => run(() => endSession(open.id))}
            >
              ■ Durdur
            </button>
          ) : (
            <button
              className="mt-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              disabled={pending || !alarmValid}
              onClick={start}
            >
              ▶ Başlat
            </button>
          )}
        </Dial>

        {open ? (
          <div className="space-y-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <p>Başlangıç {formatInTimeZone(new Date(open.started_at), "HH:mm")}</p>
            {openGoal && (
              <p>
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: openGoal.color }} />
                {openGoal.title}
                {openTopic && ` › ${openTopic.label}`}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <Pref number={1} label="Çalışma mı, mola mı?">
              <div className="flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
                {(["work", "break"] as SessionKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex-1 rounded-md px-3 py-1.5 ${
                      kind === k ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </Pref>

            <Pref number={2} label="Alarm kaçıncı dakikada çalsın?">
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_MINUTES[kind].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAlarm({ ...alarm, [kind]: String(m) })}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      alarm[kind] === String(m)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {m} dk
                  </button>
                ))}
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    placeholder="—"
                    value={alarm[kind]}
                    onChange={(e) => setAlarm({ ...alarm, [kind]: e.target.value })}
                    className="input w-20 py-1"
                  />
                  dk
                </label>
                <button
                  type="button"
                  onClick={() => setAlarm({ ...alarm, [kind]: "" })}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    alarm[kind] === ""
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  Alarm yok
                </button>
              </div>
              {!alarmValid && <p className="text-xs text-red-600 dark:text-red-400">1–600 arası bir dakika gir.</p>}
            </Pref>

            {kind === "work" && (
              <Pref number={3} label="Hangi ders / proje?">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={goalId}
                    onChange={(e) => {
                      setGoalId(e.target.value);
                      setTopicId("");
                    }}
                    className="input"
                  >
                    <option value="">— Seçme —</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={topicId}
                    disabled={!selectedGoal || selectedGoal.topics.length === 0}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="input disabled:opacity-60"
                  >
                    <option value="">Konu (isteğe bağlı)</option>
                    {selectedGoal?.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Pref>
            )}
          </div>
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
                  <span className={`w-16 shrink-0 text-xs font-medium ${KIND_COLORS[s.kind].text}`}>{KIND_LABELS[s.kind]}</span>
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

// Yuvarlak kronometre: dış halka ilerlemeyi, içi süreyi ve düğmeyi gösterir.
// smooth: sabit sürede halka yumuşak ilerler; süresizde dakika başında başa döndüğü için animasyon yok.
function Dial({
  progress,
  kind,
  smooth,
  children,
}: {
  progress: number;
  kind: SessionKind;
  smooth: boolean;
  children: React.ReactNode;
}) {
  const r = 130;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative h-72 w-72 [:fullscreen_&]:h-[28rem] [:fullscreen_&]:w-[28rem]">
      <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="150" cy="150" r={r} fill="none" strokeWidth="10" className="stroke-zinc-200 dark:stroke-zinc-800" />
        <circle
          cx="150"
          cy="150"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`${KIND_COLORS[kind].ring} ${smooth ? "transition-[stroke-dashoffset] duration-1000 ease-linear" : ""}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">{children}</div>
    </div>
  );
}

function Pref({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">
          {number}
        </span>
        {label}
      </p>
      {children}
    </div>
  );
}
