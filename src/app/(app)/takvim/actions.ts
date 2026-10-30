"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action";

export type PlanInput = {
  title: string;
  starts_at: string;
  ends_at: string;
  goal_id: string | null;
  topic_id: string | null;
  done?: boolean;
};

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

function validate(input: Pick<PlanInput, "starts_at" | "ends_at"> & { title?: string }): string | null {
  if (input.title !== undefined && !input.title.trim()) return "Başlık gerekli.";
  const start = Date.parse(input.starts_at);
  const end = Date.parse(input.ends_at);
  if (Number.isNaN(start) || Number.isNaN(end)) return "Geçerli bir başlangıç ve bitiş gir.";
  if (end <= start) return "Bitiş, başlangıçtan sonra olmalı.";
  return null;
}

export async function savePlan(id: string | null, input: PlanInput): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { error: invalid };
  const fields = { ...input, title: input.title.trim() };
  const supabase = await authed();
  const { error } = id
    ? await supabase.from("plans").update(fields).eq("id", id)
    : await supabase.from("plans").insert(fields);
  return done(error);
}

// Takvimde sürükleme / boyutlandırma sonrası sadece zamanı günceller.
export async function movePlan(id: string, starts_at: string, ends_at: string): Promise<ActionResult> {
  const invalid = validate({ starts_at, ends_at });
  if (invalid) return { error: invalid };
  const supabase = await authed();
  const { error } = await supabase.from("plans").update({ starts_at, ends_at }).eq("id", id);
  return done(error);
}

export async function setPlanDone(id: string, isDone: boolean): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("plans").update({ done: isDone }).eq("id", id);
  return done(error);
}

export async function deletePlan(id: string): Promise<ActionResult> {
  const supabase = await authed();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  return done(error);
}
