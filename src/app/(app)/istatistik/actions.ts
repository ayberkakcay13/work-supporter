"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action";
import type { ReviewPeriod } from "@/lib/stats";

// Özet görüldü olarak işaretlenir; aynı dönem için tekrar gösterilmez.
export async function markReviewSeen(type: ReviewPeriod, periodStart: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { error: "Geçersiz dönem." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Giriş yapılmamış");

  const { error } = await supabase
    .from("reviews")
    .upsert(
      { user_id: data.user.id, period_type: type, period_start: periodStart },
      { onConflict: "user_id,period_type,period_start", ignoreDuplicates: true },
    );
  return error ? { error: error.message } : {};
}
