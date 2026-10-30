"use client";

import { useEffect, useRef, useState } from "react";
import type { PeriodSummary } from "@/lib/stats";
import { markReviewSeen } from "@/app/(app)/istatistik/actions";
import { SummaryView } from "./SummaryView";

// Yeni hafta / ayda ilk açılışta biten dönemin özetini bir kez gösterir.
export function ReviewModal({ summaries }: { summaries: PeriodSummary[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const current = summaries[index];

  useEffect(() => {
    if (current && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [current]);

  if (!current) return null;

  return (
    <dialog
      ref={dialogRef}
      // Esc ile kapatmak da "görüldü" sayılır.
      onClose={() => {
        void markReviewSeen(current.type, current.start);
        setIndex(index + 1);
      }}
      className="m-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="space-y-5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {current.type === "week" ? "Haftalık değerlendirme" : "Aylık değerlendirme"}
          </p>
          <h2 className="text-xl font-semibold first-letter:uppercase">{current.label}</h2>
        </div>
        <SummaryView summary={current} />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Geçmiş özetlere İstatistik ekranından ulaşabilirsin.</p>
          <button className="btn-primary" onClick={() => dialogRef.current?.close()}>
            {index < summaries.length - 1 ? "Sonraki" : "Tamam"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
