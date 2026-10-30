"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import type { ThemePref } from "@/lib/theme";

const THEME_OPTIONS: { value: ThemePref; label: string; hint: string }[] = [
  { value: "light", label: "Açık", hint: "Her zaman açık tema" },
  { value: "dark", label: "Koyu", hint: "Her zaman koyu tema" },
  { value: "auto", label: "Otomatik", hint: "08:00–18:00 açık, 18:00–08:00 koyu" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { pref, resolved, setPref } = useTheme();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>

      <section className="card space-y-3">
        <div>
          <h2 className="font-medium">Tema</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Şu an: {resolved === "dark" ? "koyu" : "açık"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPref(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                pref === opt.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{opt.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Sayaç</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Varsayılan süreler ve ses ayarı 4. aşamada eklenecek.
        </p>
      </section>

      <section className="card flex items-center justify-between">
        <h2 className="font-medium">Hesap</h2>
        <button type="button" onClick={signOut} className="btn-secondary">
          Çıkış yap
        </button>
      </section>
    </div>
  );
}
