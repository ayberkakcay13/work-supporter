"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action";

// Sunucu eylemini geçiş içinde çalıştırır; hata mesajını ve bekleme durumunu tutar.
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
        else onSuccess?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bir hata oluştu.");
      }
    });
  }

  return { pending, error, run };
}
