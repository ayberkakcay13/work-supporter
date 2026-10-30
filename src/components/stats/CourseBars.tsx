import { formatTotal } from "@/lib/sessions";
import type { CourseTime } from "@/lib/stats";

// Yatay çubuklar: renk hedefi (dersi) gösterir, metin her zaman metin renginde kalır.
export function CourseBars({ items }: { items: CourseTime[] }) {
  const max = Math.max(...items.map((i) => i.ms), 1);
  const total = items.reduce((sum, i) => sum + i.ms, 0);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 truncate">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.label}</span>
          </span>
          <span className="h-3 overflow-hidden rounded-r bg-transparent" title={formatTotal(item.ms)}>
            <span
              className="block h-full rounded-r"
              style={{ width: `${(item.ms / max) * 100}%`, minWidth: 4, backgroundColor: item.color }}
            />
          </span>
          <span className="w-28 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
            {formatTotal(item.ms)}
            <span className="ml-1 text-xs text-zinc-400">%{Math.round((item.ms / total) * 100)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
