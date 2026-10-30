export type SessionKind = "work" | "break";

export type Session = {
  id: string;
  kind: SessionKind;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number | null;
  goal_id: string | null;
  topic_id: string | null;
};

export const SESSION_COLUMNS = "id, kind, started_at, ended_at, planned_minutes, goal_id, topic_id";

const MINUTE = 60_000;

// Sabit süreli oturumun planlanan bitişi; süresiz oturumda null.
export function plannedEnd(s: Pick<Session, "started_at" | "planned_minutes">): number | null {
  return s.planned_minutes ? Date.parse(s.started_at) + s.planned_minutes * MINUTE : null;
}

// Oturumun süresi (ms). Açık oturum "now"a kadar sayılır, sabit süreli olan planlanan süreyi aşmaz.
export function sessionDuration(s: Session, now: number): number {
  const end = s.ended_at ? Date.parse(s.ended_at) : Math.min(now, plannedEnd(s) ?? now);
  return Math.max(0, end - Date.parse(s.started_at));
}

// Sadece çalışma oturumları, [from, to) aralığına düşen kısımlarıyla toplanır.
export function workTotal(sessions: Session[], from: number, to: number, now: number): number {
  return sessions
    .filter((s) => s.kind === "work")
    .reduce((sum, s) => {
      const start = Date.parse(s.started_at);
      const end = start + sessionDuration(s, now);
      return sum + Math.max(0, Math.min(end, to) - Math.max(start, from));
    }, 0);
}

// 5400000 → "1 sa 30 dk", 300000 → "5 dk"
export function formatTotal(ms: number): string {
  const minutes = Math.floor(ms / MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

// Sayaç gösterimi: 1500000 → "25:00", 3725000 → "1:02:05"
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
