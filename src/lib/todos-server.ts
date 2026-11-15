import "server-only";
import { createClient } from "@/lib/supabase/server";
import { goalDate, localInputToIso, type Goal, type Topic, TOPIC_COLUMNS } from "@/lib/goals";
import { PLAN_COLUMNS, type Plan } from "@/lib/plans";
import { TODO_COLUMNS, shiftPeriod, type Todo, type TodoScope } from "@/lib/todos";
import type { GoalOption } from "@/components/todos/TodoList";

// Yapılacaklar sayfasının tüm verisi tek seferde, paralel 4 sorguyla okunur.
// Hedefler hem madde listesinde hem dönem özetinde kullanılır; bir kez çekilir.
export async function fetchTodoPage(scope: TodoScope, periodStart: string) {
  const periodEnd = shiftPeriod(scope, periodStart, 1);
  const from = localInputToIso(`${periodStart}T00:00`)!;
  const to = localInputToIso(`${periodEnd}T00:00`)!;

  const supabase = await createClient();
  const [todos, goals, topics, plans] = await Promise.all([
    supabase.from("todos").select(TODO_COLUMNS).eq("scope", scope).eq("period_start", periodStart),
    supabase
      .from("goals")
      .select("id, type, title, course_code, starts_at, ends_at, location, color, notes")
      .order("starts_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("topics")
      .select(TOPIC_COLUMNS)
      .gte("due_date", periodStart)
      .lt("due_date", periodEnd)
      .order("due_date"),
    supabase.from("plans").select(PLAN_COLUMNS).gte("starts_at", from).lt("starts_at", to).order("starts_at"),
  ]);

  const allGoalRows = (goals.data ?? []) as Goal[];

  // --- Maddeler ve maddelere bağlanabilecek hedefler
  const todoError = todos.error ?? goals.error;
  const data = todoError
    ? ({ error: todoError.message } as const)
    : ({
        todos: todos.data as Todo[],
        // Seçim listesinde dönemden önce bitmiş hedefler gösterilmez.
        goalOptions: allGoalRows
          .filter((g) => {
            const end = g.ends_at ?? g.starts_at;
            return !end || end.slice(0, 10) >= periodStart;
          })
          .map(({ id, title, color }): GoalOption => ({ id, title, color })),
        // Listede bağlı olduğu hedef, seçim listesinde olmasa da renkli görünsün.
        allGoals: allGoalRows.map(({ id, title, color }): GoalOption => ({ id, title, color })),
      } as const);

  // --- Dönem içindeki sınav/projeler, konu tamamlama tarihleri ve çalışma planları
  const overviewError = goals.error ?? topics.error ?? plans.error;
  // Dönemle kesişen hedefler: başlangıcı (yoksa bitişi) dönem bitmeden, bitişi (yoksa başlangıcı) dönem başladıktan sonra.
  const overview = overviewError
    ? ({ error: overviewError.message } as const)
    : ({
        goals: allGoalRows
          .filter((g) => {
            const start = g.starts_at ?? g.ends_at;
            const end = g.ends_at ?? g.starts_at;
            return start && end && Date.parse(start) < Date.parse(to) && Date.parse(end) >= Date.parse(from);
          })
          .sort((a, b) => goalDate(a)!.localeCompare(goalDate(b)!)),
        topics: topics.data as Topic[],
        plans: plans.data as Plan[],
      } as const);

  return { data, overview };
}
