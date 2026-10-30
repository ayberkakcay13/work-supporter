"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"giris" | "kayit">("giris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "hata" | "bilgi"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "giris") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ kind: "hata", text: "Giriş yapılamadı: e-posta ya da şifre hatalı." });
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setMessage({ kind: "hata", text: `Hesap oluşturulamadı: ${error.message}` });
    } else if (data.session) {
      router.replace("/");
      router.refresh();
    } else {
      setMessage({
        kind: "bilgi",
        text: "Doğrulama e-postası gönderildi. Bağlantıya tıkladıktan sonra giriş yapabilirsin.",
      });
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <h1 className="text-xl font-semibold">Çalışma Planlayıcı</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mode === "giris" ? "Hesabına giriş yap" : "Yeni hesap oluştur"}
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">E-posta</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Şifre</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "giris" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>

        {message && (
          <p
            className={
              message.kind === "hata"
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {message.text}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Bekleyin…" : mode === "giris" ? "Giriş yap" : "Hesap oluştur"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "giris" ? "kayit" : "giris");
            setMessage(null);
          }}
          className="w-full text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {mode === "giris" ? "Hesabın yok mu? Hesap oluştur" : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </form>
    </main>
  );
}
