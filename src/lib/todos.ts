import { addDays, addMonths, addWeeks, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

export type TodoScope = "day" | "week" | "month";

export type Todo = {
  id: string;
  title: string;
  scope: TodoScope;
  period_start: string;
  done_at: string | null;
  goal_id: string | null;
  sort_order: number;
  created_at: string;
};

export const TODO_COLUMNS = "id, title, scope, period_start, done_at, goal_id, sort_order, created_at";

// Adres çubuğunda Türkçe kısa adlar kullanılır: /yapilacaklar?kapsam=hafta
export const SCOPE_SLUGS: Record<TodoScope, string> = { day: "gun", week: "hafta", month: "ay" };
export const SCOPE_LABELS: Record<TodoScope, string> = { day: "Günlük", week: "Haftalık", month: "Aylık" };

export function scopeFromSlug(slug: string | undefined): TodoScope {
  const found = (Object.keys(SCOPE_SLUGS) as TodoScope[]).find((s) => SCOPE_SLUGS[s] === slug);
  return found ?? "day";
}

// Tarihler "yyyy-MM-dd" metni olarak tutulur; hesaplar sadece takvim günü üzerinden yapılır.
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

// Dönemin ilk günü: gün için kendisi, hafta için Pazartesi, ay için ayın 1'i.
export function periodStart(scope: TodoScope, day: string): string {
  const d = parseISO(day);
  if (scope === "week") return ymd(startOfWeek(d, { weekStartsOn: 1 }));
  if (scope === "month") return ymd(startOfMonth(d));
  return ymd(d);
}

export function shiftPeriod(scope: TodoScope, start: string, amount: number): string {
  const d = parseISO(start);
  if (scope === "week") return ymd(addWeeks(d, amount));
  if (scope === "month") return ymd(addMonths(d, amount));
  return ymd(addDays(d, amount));
}

export function periodLabel(scope: TodoScope, start: string): string {
  const d = parseISO(start);
  if (scope === "month") return format(d, "LLLL yyyy", { locale: tr });
  if (scope === "week") {
    const end = endOfWeek(d, { weekStartsOn: 1 });
    const sameMonth = d.getMonth() === end.getMonth();
    return `${format(d, sameMonth ? "d" : "d MMMM", { locale: tr })} – ${format(end, "d MMMM yyyy", { locale: tr })}`;
  }
  return format(d, "d MMMM yyyy, EEEE", { locale: tr });
}

export const CURRENT_LABELS: Record<TodoScope, string> = { day: "Bugün", week: "Bu hafta", month: "Bu ay" };
