"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playChime } from "@/lib/sound";

type Values = { default_work_min: number; default_break_min: number; sound_enabled: boolean };

// Ayarlar ekranındaki sayaç bölümü: varsayılan süreler ve ses.
export function TimerSettings() {
  const [values, setValues] = useState<Values | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("settings")
      .select("default_work_min, default_break_min, sound_enabled")
      .maybeSingle()
      .then(({ data }) => setValues(data ?? { default_work_min: 25, default_break_min: 10, sound_enabled: true }));
  }, []);

  async function save(next: Values) {
    setValues(next);
    setStatus(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("settings").upsert({ user_id: data.user.id, ...next });
    setStatus(error ? `Kaydedilemedi: ${error.message}` : "Kaydedildi");
  }

  if (!values) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Yükleniyor…</p>;

  const minutes = (key: "default_work_min" | "default_break_min", label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={600}
          defaultValue={values[key]}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n > 0 && n <= 600 && n !== values[key]) void save({ ...values, [key]: n });
          }}
          className="input w-20 py-1.5"
        />
        dk
      </span>
    </label>
  );

  return (
    <div className="space-y-3">
      {minutes("default_work_min", "Varsayılan çalışma süresi")}
      {minutes("default_break_min", "Varsayılan mola süresi")}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Süre dolunca ses çal</span>
        <span className="flex items-center gap-2">
          <button type="button" className="btn-ghost" onClick={playChime}>
            Dinle
          </button>
          <input
            type="checkbox"
            checked={values.sound_enabled}
            onChange={(e) => void save({ ...values, sound_enabled: e.target.checked })}
            className="h-4 w-4 accent-indigo-600"
          />
        </span>
      </label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Sayaçta en son kullandığın süreler de buraya kaydedilir ve bir dahaki sefere hazır gelir.
        {status && ` · ${status}`}
      </p>
    </div>
  );
}
