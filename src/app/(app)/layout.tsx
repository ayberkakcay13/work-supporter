import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ReviewGate } from "@/components/stats/ReviewGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
      {/* Haftalık / aylık değerlendirme sayfanın geri kalanını bekletmeden yüklenir. */}
      <Suspense fallback={null}>
        <ReviewGate />
      </Suspense>
    </div>
  );
}
