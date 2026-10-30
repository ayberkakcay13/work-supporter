import { localInputToIso, topicStatus, type Goal, type Topic } from "@/lib/goals";
import { workTotal, type Session } from "@/lib/sessions";
import { periodLabel, shiftPeriod } from "@/lib/todos";

export type ReviewPeriod = "week" | "month";

export type CourseTime = { key: string; label: string; color: string; ms: number };

export type PeriodSummary = {
  type: ReviewPeriod;
  start: string;
  label: string;
  onTime: number;
  late: number;
  overdue: number;
  missNotes: { topic: string; goal: string; note: string }[];
  totalMs: number;
  byCourse: CourseTime[];
};

const NO_GOAL_COLOR = "#a1a1aa";

// "yyyy-MM-dd" gün başlangıcının (İstanbul) zaman damgası.
export function dayStartMs(day: string): number {
  return Date.parse(localInputToIso(`${day}T00:00`)!);
}

// Ders bazlı süre: aynı ders kodlu hedefler (ör. HUM 300 MT2 ve MT3) birleşir.
export function timeByCourse(sessions: Session[], goals: Goal[], from: number, to: number, now: number): CourseTime[] {
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const groups = new Map<string, CourseTime>();

  for (const s of sessions) {
    if (s.kind !== "work") continue;
    const ms = workTotal([s], from, to, now);
    if (ms === 0) continue;
    const goal = s.goal_id ? goalById.get(s.goal_id) : undefined;
    const key = goal ? (goal.course_code ?? goal.id) : "_";
    const group = groups.get(key) ?? {
      key,
      label: goal ? (goal.course_code ?? goal.title) : "Hedefsiz",
      color: goal?.color ?? NO_GOAL_COLOR,
      ms: 0,
    };
    group.ms += ms;
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => b.ms - a.ms);
}

// Haftalık / aylık değerlendirme: tamamlama tarihi döneme düşen konular ve dönemdeki çalışma.
export function summarizePeriod(
  type: ReviewPeriod,
  start: string,
  data: { sessions: Session[]; topics: Topic[]; goals: Goal[] },
  today: string,
  now: number,
): PeriodSummary {
  const end = shiftPeriod(type, start, 1);
  const from = dayStartMs(start);
  const to = dayStartMs(end);
  const goalTitle = new Map(data.goals.map((g) => [g.id, g.title]));

  const due = data.topics.filter((t) => t.due_date && t.due_date >= start && t.due_date < end);
  const statuses = due.map((t) => topicStatus(t, today));

  return {
    type,
    start,
    label: periodLabel(type, start),
    onTime: statuses.filter((s) => s === "zamanında tamamlandı").length,
    late: statuses.filter((s) => s === "geç tamamlandı").length,
    overdue: statuses.filter((s) => s.startsWith("gecikti")).length,
    missNotes: due
      .filter((t) => t.miss_note)
      .map((t) => ({ topic: t.title, goal: goalTitle.get(t.goal_id) ?? "", note: t.miss_note! })),
    totalMs: workTotal(data.sessions, from, to, now),
    byCourse: timeByCourse(data.sessions, data.goals, from, to, now),
  };
}

export function hasActivity(s: PeriodSummary): boolean {
  return s.totalMs > 0 || s.onTime + s.late + s.overdue > 0;
}
