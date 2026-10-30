"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action";

// Gün planı sadece bu sayfanın taslağıdır; diğer ekranları yenilemeye gerek yok (refresh çağrılmaz).
async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Giriş yapılmamış");
  return { supabase, userId: data.user.id };
}

const validSlot = (day: string, hour: number) =>
  /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isInteger(hour) && hour >= 7 && hour <= 23;

// Saate plan yerleştirir; o saatte başka plan ya da not varsa yerine geçer.
export async function placeSlot(day: string, hour: number, planId: string): Promise<ActionResult> {
  if (!validSlot(day, hour)) return { error: "Geçersiz saat." };
  const { supabase, userId } = await authed();
  const { error } = await supabase
    .from("day_slots")
    .upsert({ user_id: userId, day, hour, plan_id: planId, note: null }, { onConflict: "user_id,day,hour" });
  return error ? { error: error.message } : {};
}

// Saate elle yazılan kısa not (ör. "Yemek"); o saatteki plan ya da notun yerine geçer.
export async function writeNote(day: string, hour: number, note: string): Promise<ActionResult> {
  if (!validSlot(day, hour)) return { error: "Geçersiz saat." };
  note = note.trim();
  if (!note) return { error: "Not boş olamaz." };
  if (note.length > 80) return { error: "Not en fazla 80 karakter olabilir." };
  const { supabase, userId } = await authed();
  const { error } = await supabase
    .from("day_slots")
    .upsert({ user_id: userId, day, hour, plan_id: null, note }, { onConflict: "user_id,day,hour" });
  return error ? { error: error.message } : {};
}

export async function clearSlot(day: string, hour: number): Promise<ActionResult> {
  if (!validSlot(day, hour)) return { error: "Geçersiz saat." };
  const { supabase } = await authed();
  const { error } = await supabase.from("day_slots").delete().eq("day", day).eq("hour", hour);
  return error ? { error: error.message } : {};
}
