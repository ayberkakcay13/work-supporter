import { TodayHeader } from "@/components/TodayHeader";

export default function TodayPage() {
  return (
    <div className="space-y-6">
      <TodayHeader />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-medium">Bugünün planları</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Takvim 2. aşamada eklenecek.</p>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Günlük yapılacaklar</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Yapılacaklar 3. aşamada eklenecek.</p>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Sayaç</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sayaç 4. aşamada eklenecek.</p>
        </section>
        <section className="card">
          <h2 className="mb-2 font-medium">Çalışma süresi</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bugün / bu hafta toplamları 4. aşamada gelecek.</p>
        </section>
      </div>
    </div>
  );
}
