export type Plan = {
  id: string;
  goal_id: string | null;
  topic_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  done: boolean;
};

export const PLAN_COLUMNS = "id, goal_id, topic_id, title, starts_at, ends_at, done";

export const DEFAULT_PLAN_COLOR = "#6366f1";
