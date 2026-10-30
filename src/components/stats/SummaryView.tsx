import { formatTotal } from "@/lib/sessions";
import type { PeriodSummary } from "@/lib/stats";
import { CourseBars } from "./CourseBars";

// Haftalık / aylık değerlendirmenin içeriği (modal ve İstatistik ekranı ortak).
export function SummaryView({ summary }: { summary: PeriodSummary }) {
  const tiles = [
    { label: "Toplam çalışma", value: formatTotal(summary.totalMs) },
    { label: "Zamanında biten", value: String(summary.onTime) },
    { label: "Geç biten", value: String(summary.late) },
    { label: "Yetişmeyen", value: String(summary.overdue) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.label}</p>
            <p className="text-xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ders bazlı süre</h3>
        {summary.byCourse.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bu dönemde sayaç kaydı yok.</p>
        ) : (
          <CourseBars items={summary.byCourse} />
        )}
      </div>

      {summary.missNotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Gecikme notları</h3>
          <ul className="space-y-2 text-sm">
            {summary.missNotes.map((n, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                <p className="font-medium">
                  {n.topic} <span className="font-normal text-zinc-500 dark:text-zinc-400">· {n.goal}</span>
                </p>
                <p className="text-zinc-600 dark:text-zinc-300">{n.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
