"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyTheme, resolveTheme, THEME_STORAGE_KEY, type ThemePref } from "@/lib/theme";

type ThemeContextValue = {
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (pref: ThemePref) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Tercih localStorage'da tutulur; değişiklikler dinleyicilere bildirilir.
const listeners = new Set<() => void>();

function readStoredPref(): ThemePref {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "auto") return value;
  } catch {}
  return "auto";
}

function storePref(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {}
  listeners.forEach((l) => l());
}

// Otomatik modda saat geçişini yakalamak için dakikada iki kez ve sekmeye dönünce kontrol edilir.
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const id = window.setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    listeners.delete(onChange);
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const getServerPref = (): ThemePref => "auto";
const getResolved = () => resolveTheme(readStoredPref());
const getServerResolved = () => "light" as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pref = useSyncExternalStore(subscribe, readStoredPref, getServerPref);
  const resolved = useSyncExternalStore(subscribe, getResolved, getServerResolved);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Açılışta veritabanındaki tercihi yerel tercihe yaz.
  useEffect(() => {
    createClient()
      .from("settings")
      .select("theme")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme) storePref(data.theme as ThemePref);
      });
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    storePref(next);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("settings")
        .upsert({ user_id: data.user.id, theme: next })
        .then(({ error }) => {
          if (error) console.error("Tema kaydedilemedi:", error.message);
        });
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme, ThemeProvider içinde kullanılmalı");
  return ctx;
}
