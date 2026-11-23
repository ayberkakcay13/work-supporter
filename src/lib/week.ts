import type { Goal } from "@/lib/goals";

// Haftalık plan tahtası: solda ders kartları, Pzt–Paz sütunlarında güne bırakılmış kartlar.

export type WeekCard = {
  id: string;
  day: string; // yyyy-MM-dd
  course_code: string;
  topic: string | null;
  time: string | null; // "HH:mm", isteğe bağlı
  sort_order: number;
  done: boolean;
};

export const WEEK_CARD_COLUMNS = "id, day, course_code, topic, time, sort_order, done";

// Elle eklenmiş / düzenlenmiş ders satırı.
export type CourseRow = { code: string; name: string | null; color: string };

// Tahtada gösterilen ders kartı. fromGoal: hedeflerdeki bir ders kodundan geliyor.
// stored: courses tablosunda satırı var (ad/renk oradan).
export type Course = { code: string; name: string | null; color: string; fromGoal: boolean; stored: boolean };

export const COURSE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9", "#ef4444", "#8b5cf6", "#84cc16"];
export const UNKNOWN_COURSE_COLOR = "#a1a1aa";

// "COMP 201 MT2 — Data Structures and Algorithms" → "Data Structures and Algorithms"
function nameFromTitle(title: string): string | null {
  const i = title.indexOf("—");
  return i >= 0 ? title.slice(i + 1).trim() || null : null;
}

const normCode = (code: string) => code.trim().replace(/\s+/g, " ").toUpperCase();
export { normCode };

// Hedeflerdeki ders kodları + elle eklenen dersler. Aynı kodda tablo satırı önceliklidir.
export function mergeCourses(goals: Pick<Goal, "title" | "course_code" | "color">[], rows: CourseRow[]): Course[] {
  const map = new Map<string, Course>();
  for (const g of goals) {
    if (!g.course_code?.trim()) continue;
    const code = normCode(g.course_code);
    if (!map.has(code)) map.set(code, { code, name: nameFromTitle(g.title), color: g.color, fromGoal: true, stored: false });
  }
  for (const r of rows) {
    const code = normCode(r.code);
    const prev = map.get(code);
    map.set(code, {
      code,
      name: r.name ?? prev?.name ?? null,
      color: r.color,
      fromGoal: prev?.fromGoal ?? false,
      stored: true,
    });
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "tr"));
}

// Kartın konusu için öneriler: o ders kodundaki hedeflerin konu başlıkları.
export function topicSuggestions(
  goals: Pick<Goal, "id" | "course_code">[],
  topics: { goal_id: string; title: string }[],
): Record<string, string[]> {
  const codeByGoal = new Map(goals.filter((g) => g.course_code).map((g) => [g.id, normCode(g.course_code!)]));
  const out: Record<string, Set<string>> = {};
  for (const t of topics) {
    const code = codeByGoal.get(t.goal_id);
    if (code) (out[code] ??= new Set()).add(t.title);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
}

// Gün içindeki sıra: saati olanlar kendi sıralarında durur; sıra tamamen kullanıcının.
export function sortCards(cards: WeekCard[]): WeekCard[] {
  return [...cards].sort((a, b) => a.sort_order - b.sort_order);
}

// İki kartın arasına bırakılan kartın sırası.
export function orderBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
