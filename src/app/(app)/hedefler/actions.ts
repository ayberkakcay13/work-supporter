"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GOAL_TYPES, localInputToIso, type GoalType } from "@/lib/goals";
import { SEED_GOALS } from "@/lib/seed";

import type { ActionResult } from "@/lib/action";

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

function text(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function goalFields(form: FormData) {
  const type = String(form.get("type")) as GoalType;
  return {
    type: GOAL_TYPES.includes(type) ? type : "diğer",
    title: text(form, "title") ?? "",
    course_code: text(form, "course_code"),
    starts_at: localInputToIso(String(form.get("starts_at") ?? "")),
    ends_at: localInputToIso(String(form.get("ends_at") ?? "")),
    location: text(form, "location"),
    color: text(form, "color") ?? "#6366f1",
    notes: text(form, "notes"),
  };
}

export async function saveGoal(id: string | null, form: FormData): Promise<ActionResult> {
  const fields = goalFields(form);
  if (!fields.title) return { error: "Başlık gerekli." };
  if (fields.starts_at && fields.ends_at && fields.ends_at <= fields.starts_at) {
    return { error: "Bitiş, başlangıçtan sonra olmalı." };
  }
  const supabase = await authed();
  const { error } = id
    ? await supabase.from("goals").update(fields).eq("id", id)
    : await supabase.from("goals").insert(fields);
  return done(error);
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  return done(error);
}

export async function addTopic(
  goalId: string,
  parentId: string | null,
  title: string,
  dueDate: string | null,
): Promise<ActionResult> {
  title = title.trim();
  if (!title) return { error: "Başlık gerekli." };
  const supabase = await authed();

  // Yeni konu kardeşlerinin sonuna eklenir.
  let siblings = supabase.from("topics").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
  siblings = parentId ? siblings.eq("parent_id", parentId) : siblings.is("parent_id", null);
  const { count } = await siblings;

  const { error } = await supabase.from("topics").insert({
    goal_id: goalId,
    parent_id: parentId,
    title,
    due_date: dueDate || null,
    sort_order: count ?? 0,
  });
  return done(error);
}

export async function updateTopic(
  id: string,
  fields: { title?: string; due_date?: string | null; miss_note?: string | null },
): Promise<ActionResult> {
  if (fields.title !== undefined && !fields.title.trim()) return { error: "Başlık gerekli." };
  const supabase = await authed();
  const { error } = await supabase.from("topics").update(fields).eq("id", id);
  return done(error);
}

export async function setTopicDone(id: string, isDone: boolean): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase
    .from("topics")
    .update({ completed_at: isDone ? new Date().toISOString() : null })
    .eq("id", id);
  return done(error);
}

export async function deleteTopic(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("topics").delete().eq("id", id);
  return done(error);
}

// Başlangıç hedeflerinden henüz eklenmemiş olanları ekler.
export async function loadSeedGoals(): Promise<ActionResult> {
  const supabase = await authed();
  const { data: existing, error: readError } = await supabase.from("goals").select("title");
  if (readError) return { error: readError.message };
  const titles = new Set(existing.map((g) => g.title));
  const missing = SEED_GOALS.filter((g) => !titles.has(g.title));
  if (missing.length === 0) return {};
  const { error } = await supabase.from("goals").insert(missing);
  return done(error);
}
