import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ReviewGate } from "@/components/stats/ReviewGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      {/* Telefonda: üstte çentik / durum çubuğu, altta sekme çubuğu kadar boşluk. */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-8">{children}</main>
      {/* Haftalık / aylık değerlendirme sayfanın geri kalanını bekletmeden yüklenir. */}
      <Suspense fallback={null}>
        <ReviewGate />
      </Suspense>
    </div>
  );
}
