import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTopicTree, istanbulToday, localInputToIso, type Topic, type TopicNode } from "@/lib/goals";
import { SESSION_COLUMNS, type Session } from "@/lib/sessions";
import { Timer, type TimerGoal } from "@/components/timer/Timer";
import { requestTime } from "@/lib/dates";

export default function SayacPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>}>
      <TimerData />
    </Suspense>
  );
}

// Konu ağacını "Üst › Alt" etiketleriyle düz listeye çevirir (tamamlananlar hariç).
function openTopics(nodes: TopicNode[], prefix = ""): { id: string; label: string }[] {
  return nodes.flatMap((n) => {
    const label = prefix ? `${prefix} › ${n.title}` : n.title;
    return [...(n.completed_at ? [] : [{ id: n.id, label }]), ...openTopics(n.children, label)];
  });
}

async function TimerData() {
  await connection();
  const dayStart = localInputToIso(`${istanbulToday()}T00:00`)!;

  const supabase = await createClient();
  const [open, today, lastWork, lastBreak, goals, topics, settings] = await Promise.all([
    supabase.from("sessions").select(SESSION_COLUMNS).is("ended_at", null).maybeSingle<Session>(),
    supabase.from("sessions").select(SESSION_COLUMNS).gte("started_at", dayStart).order("started_at"),
    // Son kullanılan mod (sabit / süresiz) ve hedef seçimi son oturumlardan alınır.
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "work").order("started_at", { ascending: false }).limit(1).maybeSingle<Session>(),
    supabase.from("sessions").select(SESSION_COLUMNS).eq("kind", "break").order("started_at", { ascending: false }).limit(1).maybeSingle<Session>(),
    supabase.from("goals").select("id, title, color, starts_at, ends_at").order("starts_at", { ascending: true, nullsFirst: false }),
    supabase.from("topics").select("id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at"),
    supabase.from("settings").select("default_work_min, default_break_min, sound_enabled").maybeSingle(),
  ]);

  const error = open.error ?? today.error ?? goals.error ?? topics.error ?? settings.error;
  if (error) return <div className="card text-sm text-red-600 dark:text-red-400">Yüklenemedi: {error.message}</div>;

  const now = requestTime();
  const tree = buildTopicTree(topics.data as Topic[]);
  // Bitmiş hedefler listelenmez; açık oturumun hedefi her durumda listede kalır.
  const timerGoals: TimerGoal[] = goals
    .data!.filter((g) => {
      const end = g.ends_at ?? g.starts_at;
      return !end || Date.parse(end) >= now || g.id === open.data?.goal_id;
    })
    .map((g) => ({
      id: g.id,
      title: g.title,
      color: g.color,
      topics: openTopics(tree.filter((t) => t.goal_id === g.id)),
    }));

  const last = (today.data as Session[]).filter((s) => s.ended_at).at(-1) ?? null;

  return (
    <Timer
      key={open.data?.id ?? "bos"}
      open={open.data}
      todaySessions={today.data as Session[]}
      lastEnded={last}
      goals={timerGoals}
      defaults={{
        workFixed: lastWork.data ? lastWork.data.planned_minutes !== null : true,
        breakFixed: lastBreak.data ? lastBreak.data.planned_minutes !== null : true,
        workMin: settings.data?.default_work_min ?? 25,
        breakMin: settings.data?.default_break_min ?? 10,
        goalId: lastWork.data?.goal_id ?? "",
        topicId: lastWork.data?.topic_id ?? "",
      }}
      soundEnabled={settings.data?.sound_enabled ?? true}
      dayStart={dayStart}
      serverNow={now}
    />
  );
}
