"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Bugün", icon: "☀️" },
  { href: "/hedefler", label: "Hedefler", icon: "🎯" },
  { href: "/takvim", label: "Takvim", icon: "📅" },
  { href: "/yapilacaklar", label: "Yapılacaklar", icon: "✅" },
  { href: "/sayac", label: "Sayaç", icon: "⏱️" },
  { href: "/istatistik", label: "İstatistik", icon: "📊" },
  { href: "/ayarlar", label: "Ayarlar", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6 px-3 text-lg font-semibold">Çalışma Planlayıcı</div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
