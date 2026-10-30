import { TZDate } from "@date-fns/tz";
import { formatInTimeZone } from "@/lib/dates";
import { TIME_ZONE } from "@/lib/theme";

export type GoalType = "sınav" | "proje" | "diğer";

export const GOAL_TYPES: GoalType[] = ["sınav", "proje", "diğer"];

export type Goal = {
  id: string;
  type: GoalType;
  title: string;
  course_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  color: string;
  notes: string | null;
};

export type Topic = {
  id: string;
  goal_id: string;
  parent_id: string | null;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  miss_note: string | null;
  sort_order: number;
  created_at: string;
  // Çalışılacak süre (dakika); boş olabilir.
  planned_minutes: number | null;
};

export const TOPIC_COLUMNS =
  "id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at, planned_minutes";

export type TopicNode = Topic & { children: TopicNode[] };

export type TopicStatus =
  | "bekliyor"
  | "zamanında tamamlandı"
  | "geç tamamlandı"
  | "gecikti (not bekliyor)"
  | "gecikti (notlu)";

// Durum etiketlerinin renkleri.
export const STATUS_STYLES: Record<TopicStatus, string> = {
  bekliyor: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  "zamanında tamamlandı": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "geç tamamlandı": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "gecikti (not bekliyor)": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "gecikti (notlu)": "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

// Bugünün tarihi İstanbul saatine göre, "yyyy-MM-dd".
export function istanbulToday(now: Date = new Date()): string {
  return formatInTimeZone(now, "yyyy-MM-dd");
}

// Tarihler "yyyy-MM-dd" biçiminde olduğu için metin karşılaştırması yeterli.
export function topicStatus(topic: Topic, today: string): TopicStatus {
  if (topic.completed_at) {
    const doneDay = formatInTimeZone(new Date(topic.completed_at), "yyyy-MM-dd");
    return !topic.due_date || doneDay <= topic.due_date ? "zamanında tamamlandı" : "geç tamamlandı";
  }
  if (topic.due_date && topic.due_date < today) {
    return topic.miss_note ? "gecikti (notlu)" : "gecikti (not bekliyor)";
  }
  return "bekliyor";
}

export function buildTopicTree(topics: Topic[]): TopicNode[] {
  const nodes = new Map<string, TopicNode>();
  for (const t of topics) nodes.set(t.id, { ...t, children: [] });

  const roots: TopicNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    (parent ? parent.children : roots).push(node);
  }

  const sort = (list: TopicNode[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

// <input type="datetime-local"> değeri ("2026-11-03T18:00") İstanbul saati olarak yorumlanır.
export function localInputToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return new TZDate(y, mo - 1, d, h, mi, TIME_ZONE).toISOString();
}

export function isoToLocalInput(iso: string | null): string {
  return iso ? formatInTimeZone(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";
}

// Hedef tarihine kalan gün (İstanbul takvim günü olarak). Geçmişse negatif.
export function daysUntil(iso: string, today: string): number {
  const target = formatInTimeZone(new Date(iso), "yyyy-MM-dd");
  return Math.round((Date.parse(target) - Date.parse(today)) / 86_400_000);
}

// Hedefin tarihi: sınav gibi saatli hedeflerde başlangıç, sadece bitiş tarihi girilmişse bitiş.
export function goalDate(goal: Pick<Goal, "starts_at" | "ends_at">): string | null {
  return goal.starts_at ?? goal.ends_at;
}
