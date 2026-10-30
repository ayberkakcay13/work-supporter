"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localInputToIso } from "@/lib/goals";
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

export type GoalInput = {
  title: string;
  color: string;
  // Bitiş (son) günü, "yyyy-MM-dd". null = tarih yok.
  dueDate: string | null;
};

// Hedefte sadece başlık, renk ve bitiş günü girilir. Bitiş günü o günün sonu (23:59, İstanbul) olarak saklanır.
// Düzenlemede gün değişmediyse eski saatler (ör. sınavın 18:00–20:00'si) korunur.
export async function saveGoal(id: string | null, input: GoalInput, dueChanged: boolean): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Başlık gerekli." };
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { error: "Geçerli bir tarih gir." };
  const color = /^#[0-9a-fA-F]{6}$/.test(input.color) ? input.color : "#6366f1";
  const due = input.dueDate ? { starts_at: null, ends_at: localInputToIso(`${input.dueDate}T23:59`) } : { starts_at: null, ends_at: null };

  const supabase = await authed();
  const { error } = id
    ? await supabase
        .from("goals")
        .update({ title, color, ...(dueChanged ? due : {}) })
        .eq("id", id)
    : await supabase.from("goals").insert({ title, color, type: "diğer", ...due });
  return done(error);
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  return done(error);
}

// Çalışılacak süre boş olabilir; doluysa 1 dakika – 100 saat.
const validMinutes = (m: number | null) => m === null || (Number.isInteger(m) && m > 0 && m <= 6000);

export async function addTopic(
  goalId: string,
  parentId: string | null,
  title: string,
  dueDate: string | null,
  plannedMinutes: number | null,
): Promise<ActionResult> {
  title = title.trim();
  if (!title) return { error: "Başlık gerekli." };
  if (!validMinutes(plannedMinutes)) return { error: "Süre 0 ile 100 saat arasında olmalı." };
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
    planned_minutes: plannedMinutes,
    sort_order: count ?? 0,
  });
  return done(error);
}

export async function updateTopic(
  id: string,
  fields: { title?: string; due_date?: string | null; miss_note?: string | null; planned_minutes?: number | null },
): Promise<ActionResult> {
  if (fields.title !== undefined && !fields.title.trim()) return { error: "Başlık gerekli." };
  if (fields.planned_minutes !== undefined && !validMinutes(fields.planned_minutes)) {
    return { error: "Süre 0 ile 100 saat arasında olmalı." };
  }
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
