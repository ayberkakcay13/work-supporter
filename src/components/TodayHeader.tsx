"use client";

import { useSyncExternalStore } from "react";
import { formatInTimeZone } from "@/lib/dates";

const noopSubscribe = () => () => {};

export function TodayHeader() {
  // Tarih sadece tarayıcıda hesaplanır (sunucuda boş kalır).
  const label = useSyncExternalStore(
    noopSubscribe,
    () => formatInTimeZone(new Date(), "d MMMM yyyy, EEEE"),
    () => null,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bugün</h1>
      <p className="h-5 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
