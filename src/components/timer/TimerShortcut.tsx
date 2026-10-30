"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClock, plannedEnd, type Session } from "@/lib/sessions";

// Bugün sayfasındaki sayaç kısayolu: açık oturum varsa canlı süreyi gösterir.
export function TimerShortcut({ open, serverNow }: { open: Session | null; serverNow: number }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (!open) return;
    const offset = serverNow - Date.now();
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [open, serverNow]);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Şu an çalışan bir sayaç yok.</p>
        <Link href="/sayac" className="btn-primary">
          Sayacı aç
        </Link>
      </div>
    );
  }

  const end = plannedEnd(open);
  const shown = end !== null ? Math.max(0, end - now) : now - Date.parse(open.started_at);

  return (
    <Link href="/sayac" className="flex items-center justify-between gap-3 rounded-lg hover:opacity-80">
      <span className="text-sm">
        {open.kind === "work" ? "Çalışılıyor" : "Moladasın"}
        <span className="text-zinc-500 dark:text-zinc-400">{end !== null ? " · kalan" : " · geçen"}</span>
      </span>
      <span className="font-mono text-3xl font-semibold tabular-nums">{formatClock(shown)}</span>
    </Link>
  );
}
