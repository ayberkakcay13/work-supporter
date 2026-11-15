import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";
import { TimerSettings } from "@/components/TimerSettings";
import { Skeleton } from "@/components/Skeleton";

export default function SettingsPage() {
  return (
    <SettingsForm
      timerSection={
        <Suspense fallback={<Skeleton className="h-28" />}>
          <TimerSettingsData />
        </Suspense>
      }
    />
  );
}

// Sayaç ayarları sunucuda okunur; sayfa açıldıktan sonra tarayıcıdan ayrıca istek atılmaz.
async function TimerSettingsData() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("default_work_min, default_break_min, sound_enabled")
    .maybeSingle();
  return <TimerSettings initial={data ?? { default_work_min: 25, default_break_min: 10, sound_enabled: true }} />;
}
