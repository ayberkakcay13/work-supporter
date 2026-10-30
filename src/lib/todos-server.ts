import "server-only";
import { createClient } from "@/lib/supabase/server";
import { localInputToIso, type Goal, type Topic } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { TODO_COLUMNS, shiftPeriod, type Todo, type TodoScope } from "@/lib/todos";
import type { GoalOption } from "@/components/todos/TodoList";

// Bir dönemin maddeleri ve maddelere bağlanabilecek hedefler.
export async function fetchTodoData(scope: TodoScope, periodStart: string) {
  const supabase = await createClient();
  const [todos, goals] = await Promise.all([
    supabase.from("todos").select(TODO_COLUMNS).eq("scope", scope).eq("period_start", periodStart),
    supabase
      .from("goals")
      .select("id, title, color, starts_at, ends_at")
      .order("starts_at", { ascending: true, nullsFirst: false }),
  ]);

  if (todos.error || goals.error) return { error: (todos.error ?? goals.error)!.message } as const;

  // Seçim listesinde dönemden önce bitmiş hedefler gösterilmez.
  const goalOptions: GoalOption[] = goals.data
    .filter((g) => {
      const end = g.ends_at ?? g.starts_at;
      return !end || end.slice(0, 10) >= periodStart;
    })
    .map(({ id, title, color }) => ({ id, title, color }));

  // Listede bağlı olduğu hedef, seçim listesinde olmasa da renkli görünsün.
  const allGoals: GoalOption[] = goals.data.map(({ id, title, color }) => ({ id, title, color }));

  return { todos: todos.data as Todo[], goalOptions, allGoals } as const;
}

// Dönem içindeki sınav/projeler, konu tamamlama tarihleri ve çalışma planları.
export async function fetchPeriodOverview(scope: TodoScope, periodStart: string) {
  const periodEnd = shiftPeriod(scope, periodStart, 1);
  const from = localInputToIso(`${periodStart}T00:00`)!;
  const to = localInputToIso(`${periodEnd}T00:00`)!;

  const supabase = await createClient();
  const [goals, topics, plans] = await Promise.all([
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .not("starts_at", "is", null)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase
      .from("topics")
      .select("id, goal_id, parent_id, title, due_date, completed_at, miss_note, sort_order, created_at")
      .gte("due_date", periodStart)
      .lt("due_date", periodEnd)
      .order("due_date"),
    supabase.from("plans").select(PLAN_COLUMNS).gte("starts_at", from).lt("starts_at", to).order("starts_at"),
  ]);

  if (goals.error || topics.error || plans.error) {
    return { error: (goals.error ?? topics.error ?? plans.error)!.message } as const;
  }

  // Bitişi (yoksa başlangıcı) dönemin başından önce olan hedefler dışarıda kalır.
  const inPeriod = (goals.data as Goal[]).filter((g) => Date.parse((g.ends_at ?? g.starts_at)!) >= Date.parse(from));

  return { goals: inPeriod, topics: topics.data as Topic[], plans: plans.data as Plan[] } as const;
}
