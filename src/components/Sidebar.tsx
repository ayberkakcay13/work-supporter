"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; icon: string; short?: string }[] = [
  { href: "/", label: "Ana ekran", icon: "🏠", short: "Ana" },
  { href: "/hedefler", label: "Hedefler", icon: "🎯" },
  { href: "/takvim", label: "Takvim", icon: "📅" },
  { href: "/yapilacaklar", label: "Yapılacaklar", icon: "✅", short: "Liste" },
  { href: "/sayac", label: "Sayaç", icon: "⏱️" },
  { href: "/istatistik", label: "İstatistik", icon: "📊", short: "İstat." },
  { href: "/ayarlar", label: "Ayarlar", icon: "⚙️" },
];

const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

// 768 px ve üstü: soldaki yan menü. Altında: ekranın altına sabit sekme çubuğu.
export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-5 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 px-3 text-lg font-semibold">Çalışma Planlayıcı</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive(item.href, pathname)
                  ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] leading-tight ${
                active ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <span aria-hidden className="text-xl">
                {item.icon}
              </span>
              <span className="w-full truncate text-center">{item.short ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
