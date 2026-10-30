import { formatTotal } from "@/lib/sessions";
import type { CourseProgress } from "@/lib/stats";

// Plana göre ne kadar çalışıldığı (her ders, planı kadar sayılır; fazlası toplamı şişirmez).
export function overallRatio(items: CourseProgress[]): number | null {
  const planned = items.reduce((sum, i) => sum + i.plannedMs, 0);
  if (planned === 0) return null;
  const covered = items.reduce((sum, i) => sum + Math.min(i.workedMs, i.plannedMs), 0);
  return covered / planned;
}

// Dilimli halka: her ders planlanan süresi kadar yer kaplar; dilimin koyu kısmı çalışılan,
// soluk kısmı kalan süredir. Planı olmayan çalışmalar halkaya girmez (listede görünür).
export function CourseRing({ items, size = 160 }: { items: CourseProgress[]; size?: number }) {
  const planned = items.filter((i) => i.plannedMs > 0);
  const total = planned.reduce((sum, i) => sum + i.plannedMs, 0);
  const ratio = overallRatio(items);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  // Dilimler arasında yüzey renginde küçük bir boşluk.
  const gap = planned.length > 1 ? 3 : 0;

  // Her dilim, kendinden önceki dilimlerin toplamından başlar.
  const segments = planned.map((item, i) => {
    const before = planned.slice(0, i).reduce((sum, p) => sum + p.plannedMs, 0);
    const length = (item.plannedMs / total) * circumference;
    return { item, start: (before / total) * circumference, length: Math.max(0, length - gap) };
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {total === 0 && (
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-zinc-200 dark:stroke-zinc-800" />
        )}
        {segments.map(({ item, start, length }) => {
          const worked = Math.min(1, item.workedMs / item.plannedMs) * length;
          return (
            <g key={item.key}>
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                strokeWidth="12"
                stroke={item.color}
                strokeOpacity={0.22}
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-start}
              >
                <title>{`${item.label}: ${formatTotal(item.workedMs)} / ${formatTotal(item.plannedMs)}`}</title>
              </circle>
              {worked > 0 && (
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  strokeWidth="12"
                  stroke={item.color}
                  strokeDasharray={`${worked} ${circumference}`}
                  strokeDashoffset={-start}
                >
                  <title>{`${item.label}: ${formatTotal(item.workedMs)} / ${formatTotal(item.plannedMs)}`}</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{ratio === null ? "—" : `%${Math.round(ratio * 100)}`}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{ratio === null ? "plan yok" : "tamamlandı"}</span>
      </div>
    </div>
  );
}

// Ders listesi: renk, ad, çalışılan / planlanan ve küçük ilerleme çubuğu.
export function CourseList({ items }: { items: CourseProgress[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Plan ya da çalışma yok.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const done = item.plannedMs > 0 && item.workedMs >= item.plannedMs;
        return (
          <li key={item.key} className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{formatTotal(item.workedMs)}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  / {item.plannedMs > 0 ? formatTotal(item.plannedMs) : "plansız"}
                </span>
                {done && <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓</span>}
              </span>
            </div>
            {item.plannedMs > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `${item.color}38` }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(1, item.workedMs / item.plannedMs) * 100}%`, backgroundColor: item.color }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
