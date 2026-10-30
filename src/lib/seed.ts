import type { GoalType } from "@/lib/goals";

// 2026-2027 Güz dönemi başlangıç hedefleri. Saatler İstanbul saatidir (UTC+3).
export const SEED_GOALS: {
  type: GoalType;
  title: string;
  course_code: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  color: string;
}[] = [
  {
    type: "sınav",
    title: "HUM 300 MT2 — Engineering Ethics",
    course_code: "HUM 300",
    starts_at: "2026-11-03T18:00:00+03:00",
    ends_at: "2026-11-03T20:00:00+03:00",
    location: "A401",
    color: "#f59e0b",
  },
  {
    type: "sınav",
    title: "COMP 451 MT1 — Intro to NLP",
    course_code: "COMP 451",
    starts_at: "2026-11-12T09:30:00+03:00",
    ends_at: "2026-11-12T11:00:00+03:00",
    location: "A415",
    color: "#10b981",
  },
  {
    type: "sınav",
    title: "COMP 201 MT2 — Data Structures and Algorithms",
    course_code: "COMP 201",
    starts_at: "2026-12-05T10:30:00+03:00",
    ends_at: "2026-12-05T12:30:00+03:00",
    location: "A302, A415",
    color: "#6366f1",
  },
  {
    type: "sınav",
    title: "HUM 300 MT3 — Engineering Ethics",
    course_code: "HUM 300",
    starts_at: "2026-12-08T18:00:00+03:00",
    ends_at: "2026-12-08T20:00:00+03:00",
    location: "A401",
    color: "#f59e0b",
  },
  {
    type: "sınav",
    title: "COMP 421 MT2 — Computer Networks",
    course_code: "COMP 421",
    starts_at: "2026-12-11T18:00:00+03:00",
    ends_at: "2026-12-11T19:30:00+03:00",
    location: "A415, A302",
    color: "#0ea5e9",
  },
  {
    type: "proje",
    title: "COMP 491 — Senior Design Project I",
    course_code: "COMP 491",
    starts_at: "2026-12-14T00:00:00+03:00",
    ends_at: "2026-12-31T23:59:00+03:00",
    location: null,
    color: "#ec4899",
  },
];
