"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action";
import type { TodoScope } from "@/lib/todos";

// RLS zaten sadece sahibine izin verir; burada giriş yapılmış olmasını da kontrol ediyoruz.
async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Giriş yapılmamış");
  return supabase;
}

function done(error: { message: string } | null): ActionResult {
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function addTodo(
  scope: TodoScope,
  periodStart: string,
  title: string,
  goalId: string | null,
): Promise<ActionResult> {
  title = title.trim();
  if (!title) return { error: "Başlık gerekli." };
  const supabase = await authed();

  // Yeni madde listenin sonuna eklenir.
  const { count } = await supabase
    .from("todos")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq("period_start", periodStart);

  const { error } = await supabase.from("todos").insert({
    scope,
    period_start: periodStart,
    title,
    goal_id: goalId,
    sort_order: count ?? 0,
  });
  return done(error);
}

export async function setTodoDone(id: string, isDone: boolean): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("todos")
    .update({ done_at: isDone ? new Date().toISOString() : null })
    .eq("id", id);
  return done(error);
}

export async function renameTodo(id: string, title: string): Promise<ActionResult> {
  title = title.trim();
  if (!title) return { error: "Başlık gerekli." };
  const supabase = await authed();
  const { error } = await supabase.from("todos").update({ title }).eq("id", id);
  return done(error);
}

// Bitmemiş maddeyi başka bir döneme (genelde içinde bulunulan döneme) taşır.
export async function moveTodo(id: string, periodStart: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("todos").update({ period_start: periodStart }).eq("id", id);
  return done(error);
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("todos").delete().eq("id", id);
  return done(error);
}
