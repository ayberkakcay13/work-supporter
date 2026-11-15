"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notify, playChime } from "@/lib/sound";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push";

type Values = { default_work_min: number; default_break_min: number; sound_enabled: boolean };

// Ayarlar ekranındaki sayaç bölümü: varsayılan süreler ve ses.
export function TimerSettings({ initial }: { initial: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [status, setStatus] = useState<string | null>(null);

  async function save(next: Values) {
    setValues(next);
    setStatus(null);
    const supabase = createClient();
    // getSession yerel oturumu okur; Auth sunucusuna ayrıca istek atmaz.
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase.from("settings").upsert({ user_id: data.session.user.id, ...next });
    setStatus(error ? `Kaydedilemedi: ${error.message}` : "Kaydedildi");
  }

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
      <PushSetting />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Sayaçta en son kullandığın süreler de buraya kaydedilir ve bir dahaki sefere hazır gelir.
        {status && ` · ${status}`}
      </p>
    </div>
  );
}

const PUSH_LABELS: Record<PushStatus, string> = {
  on: "Açık",
  off: "Kapalı",
  denied: "Tarayıcı engelledi (site ayarlarından izin ver)",
  unsupported: "Bu tarayıcı desteklemiyor",
};

// Telefon kilitliyken de sayaç alarmı: push aboneliğini açar / kapatır.
function PushSetting() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushStatus().then(setStatus);
  }, []);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    const err = status === "on" ? await disablePush() : await enablePush();
    setMessage(err);
    setStatus(await pushStatus());
    setBusy(false);
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Bildirimler (telefon kilitliyken de)
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {status ? PUSH_LABELS[status] : "…"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {status === "on" && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => notify("Deneme bildirimi", "Sayaç bildirimleri bu cihazda çalışıyor.")}
            >
              Dene
            </button>
          )}
          {(status === "on" || status === "off") && (
            <button type="button" className="btn-secondary px-3 py-1.5" disabled={busy} onClick={toggle}>
              {status === "on" ? "Kapat" : "Aç"}
            </button>
          )}
        </span>
      </div>
      {message && <p className="text-xs text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
