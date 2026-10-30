"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import type { EventChangeArg, EventInput } from "@fullcalendar/core";
import trLocale from "@fullcalendar/core/locales/tr";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import { ACADEMIC_MARKERS } from "@/lib/academic";
import { buildTopicTree, type Goal, type Topic, type TopicNode } from "@/lib/goals";
import { DEFAULT_PLAN_COLOR, planDuration, untimedRange, type Plan } from "@/lib/plans";
import { formatTotal } from "@/lib/sessions";
import { TIME_ZONE } from "@/lib/theme";
import { movePlan, savePlan } from "@/app/(app)/takvim/actions";
import { PlanForm, type PlanDraft, type TopicOption } from "./PlanForm";

const HOUR = 3_600_000;

// Not: Adlandırılmış saat diliminde FullCalendar'ın Date nesneleri "UTC'ye zorlanmış" olur;
// bu yüzden her yerde ofset içeren metin değerleri (startStr, dateStr…) kullanılır.


function addDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function istanbulDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

// Konu ağacını "Üst › Alt" etiketleriyle düz listeye çevirir.
function flattenTopics(nodes: TopicNode[], prefix = ""): TopicOption[] {
  return nodes.flatMap((n) => {
    const label = prefix ? `${prefix} › ${n.title}` : n.title;
    return [
      { id: n.id, goalId: n.goal_id, label, done: n.completed_at !== null },
      ...flattenTopics(n.children, label),
    ];
  });
}

export function CalendarBoard({ goals, topics, plans }: { goals: Goal[]; topics: Topic[]; plans: Plan[] }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const topicOptions = useMemo(() => flattenTopics(buildTopicTree(topics)), [topics]);

  // Sağdaki listede sadece tamamlanmamış konular, hedeflere göre gruplu.
  const openTopicsByGoal = goals
    .map((g) => ({ goal: g, topics: topicOptions.filter((t) => t.goalId === g.id && !t.done) }))
    .filter((group) => group.topics.length > 0);

  const events = useMemo<EventInput[]>(() => {
    const list: EventInput[] = [];

    for (const p of plans) {
      list.push({
        id: `plan:${p.id}`,
        // Saatsiz plan gün boyu etiket olarak, süresiyle gösterilir; sadece başka güne taşınabilir.
        ...(p.untimed
          ? { title: `${p.title} · ${formatTotal(planDuration(p))}`, start: istanbulDay(p.starts_at), allDay: true, durationEditable: false }
          : { title: p.title, start: p.starts_at, end: p.ends_at }),
        color: (p.goal_id && goalById.get(p.goal_id)?.color) || DEFAULT_PLAN_COLOR,
        editable: true,
        classNames: p.done ? ["fc-plan-done"] : [],
        extendedProps: { plan: p },
      });
    }

    for (const g of goals) {
      // Sadece bitiş tarihi olan hedef o günde gün boyu etiket olarak görünür.
      if (!g.starts_at) {
        if (g.ends_at) {
          list.push({
            id: `goal:${g.id}`,
            title: `🎯 ${g.title}`,
            start: istanbulDay(g.ends_at),
            allDay: true,
            color: g.color,
            editable: false,
            classNames: ["fc-goal"],
          });
        }
        continue;
      }
      const icon = g.type === "sınav" ? "📝" : g.type === "proje" ? "📁" : "🎯";
      const multiDay = g.ends_at && istanbulDay(g.starts_at) !== istanbulDay(g.ends_at);
      list.push({
        id: `goal:${g.id}`,
        title: `${icon} ${g.title}${g.location ? ` · ${g.location}` : ""}`,
        ...(multiDay
          ? { start: istanbulDay(g.starts_at), end: addDay(istanbulDay(g.ends_at!)), allDay: true }
          : { start: g.starts_at, end: g.ends_at ?? undefined }),
        color: g.color,
        editable: false,
        classNames: ["fc-goal"],
      });
    }

    for (const t of topics) {
      if (!t.due_date || t.completed_at) continue;
      const color = goalById.get(t.goal_id)?.color ?? DEFAULT_PLAN_COLOR;
      list.push({
        id: `topic:${t.id}`,
        title: `⏰ ${t.title}`,
        start: t.due_date,
        allDay: true,
        backgroundColor: "transparent",
        borderColor: color,
        textColor: color,
        editable: false,
        classNames: ["fc-topic-due"],
      });
    }

    for (const m of ACADEMIC_MARKERS) {
      list.push({
        ...m,
        id: `academic:${m.title}`,
        editable: false,
        ...(m.end ? { display: "background", color: "#a1a1aa" } : { color: "#71717a" }),
      });
    }

    return list;
  }, [plans, goals, topics, goalById]);

  // Sağdaki konular takvime sürüklenebilir.
  useEffect(() => {
    if (!panelRef.current) return;
    const draggable = new Draggable(panelRef.current, {
      itemSelector: "[data-topic-id]",
      eventData: (el) => ({ title: el.dataset.title, duration: "01:00", create: false, color: el.dataset.color }),
    });
    return () => draggable.destroy();
  }, []);

  function newDraft(start: string, end: string, untimed: boolean): PlanDraft {
    return { id: null, title: "", goal_id: null, topic_id: null, starts_at: start, ends_at: end, done: false, untimed };
  }

  async function handleMove(info: EventChangeArg) {
    const plan = info.event.extendedProps.plan as Plan | undefined;
    // Saatli plan saatli, saatsiz plan gün boyu satırda kalmalı; aksi halde geri alınır.
    if (!plan || info.event.allDay !== plan.untimed || (!plan.untimed && !info.event.end)) {
      info.revert();
      return;
    }
    const range = plan.untimed
      ? untimedRange(info.event.startStr.slice(0, 10), planDuration(plan) / 60_000)
      : { starts_at: info.event.startStr, ends_at: info.event.endStr };
    setError(null);
    const result = await movePlan(plan.id, range.starts_at, range.ends_at);
    if (result.error) {
      info.revert();
      setError(result.error);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="card calendar p-3">
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, luxonPlugin]}
          locale={trLocale}
          timeZone={TIME_ZONE}
          firstDay={1}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          height={720}
          nowIndicator
          scrollTime="08:00:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayMaxEvents={4}
          events={events}
          selectable
          droppable
          select={(info) => {
            // Ay görünümünde güne tıklamak saatsiz (1 saatlik) plan açar.
            if (info.allDay) {
              const range = untimedRange(info.startStr, 60);
              setDraft(newDraft(range.starts_at, range.ends_at, true));
            } else {
              setDraft(newDraft(info.startStr, info.endStr, false));
            }
            info.view.calendar.unselect();
          }}
          drop={(info) => {
            const el = info.draggedEl;
            const range = info.allDay
              ? untimedRange(info.dateStr, 60)
              : { starts_at: info.dateStr, ends_at: new Date(Date.parse(info.dateStr) + HOUR).toISOString() };
            setError(null);
            savePlan(null, {
              title: el.dataset.title ?? "",
              ...range,
              goal_id: el.dataset.goalId ?? null,
              topic_id: el.dataset.topicId ?? null,
              untimed: info.allDay,
            }).then((result) => result.error && setError(result.error));
          }}
          eventClick={(info) => {
            const plan = info.event.extendedProps.plan as Plan | undefined;
            if (plan) setDraft(plan);
            else if (info.event.id.startsWith("goal:") || info.event.id.startsWith("topic:")) router.push("/hedefler");
          }}
          eventDrop={handleMove}
          eventResize={handleMove}
        />
      </div>

      <aside className="card h-fit space-y-4">
        <div>
          <h2 className="font-medium">Konular</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Bir konuyu takvime sürükleyerek çalışma planı oluştur. Takvimde boş bir yere tıklayarak da plan ekleyebilirsin.
          </p>
        </div>
        <div ref={panelRef} className="max-h-[600px] space-y-4 overflow-y-auto">
          {openTopicsByGoal.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Bekleyen konu yok. Hedefler ekranından konu ekleyebilirsin.</p>
          )}
          {openTopicsByGoal.map(({ goal, topics: list }) => (
            <div key={goal.id} className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: goal.color }}>
                {goal.title}
              </p>
              {list.map((t) => (
                <div
                  key={t.id}
                  data-topic-id={t.id}
                  data-goal-id={goal.id}
                  data-title={t.label}
                  data-color={goal.color}
                  className="cursor-grab rounded-md border-l-4 bg-zinc-50 px-2 py-1 text-sm active:cursor-grabbing dark:bg-zinc-800/60"
                  style={{ borderLeftColor: goal.color }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {draft && <PlanForm draft={draft} goals={goals} topicOptions={topicOptions} onClose={() => setDraft(null)} />}
    </div>
  );
}
