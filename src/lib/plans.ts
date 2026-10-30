import { localInputToIso } from "@/lib/goals";

export type Plan = {
  id: string;
  goal_id: string | null;
  topic_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  done: boolean;
  // Saatsiz plan: sadece gün ve süre önemli (starts_at = günün başı).
  untimed: boolean;
};

export const PLAN_COLUMNS = "id, goal_id, topic_id, title, starts_at, ends_at, done, untimed";

export const DEFAULT_PLAN_COLOR = "#6366f1";

export function planDuration(p: Pick<Plan, "starts_at" | "ends_at">): number {
  return Date.parse(p.ends_at) - Date.parse(p.starts_at);
}

// Saatsiz planın zamanları: gün başı (İstanbul) + süre.
export function untimedRange(day: string, minutes: number): { starts_at: string; ends_at: string } {
  const starts_at = localInputToIso(`${day}T00:00`)!;
  return { starts_at, ends_at: new Date(Date.parse(starts_at) + minutes * 60_000).toISOString() };
}
